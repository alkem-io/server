import {
  POLICY_RULE_ROOM_CONTRIBUTE,
  POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
  POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
} from '@common/constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomAttachmentSendService } from './room.attachment.send';

const actor = { actorID: '11111111-1111-4111-8111-111111111111' } as any;
const room = { id: '22222222-2222-4222-8222-222222222222' } as any;
const reference = { externalReference: 'media-ref', displayName: 'résumé.png' };
const bucket = { id: 'bucket', authorization: { id: 'policy' } };

describe('sending a completed media reference', () => {
  const attachments = {
    getTargetBucketForRoom: vi.fn(),
    matchesBucketPolicy: vi.fn(),
  };
  const files = { getReferenceMetadata: vi.fn() };
  const auth = { grantAccessOrFail: vi.fn() };
  let service: RoomAttachmentSendService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RoomAttachmentSendService(
      attachments as any,
      files as any,
      auth as any
    );
    attachments.getTargetBucketForRoom.mockResolvedValue(bucket);
    attachments.matchesBucketPolicy.mockReturnValue(true);
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'image/png',
      size: 5,
      width: 2,
      height: 3,
    });
  });

  it('uses stored metadata for the reference at send time', async () => {
    expect(await service.existingMedia(room, actor, reference as any)).toEqual({
      media_id: reference.externalReference,
      display_name: reference.displayName,
      mime_type: 'image/png',
      size: 5,
      width: 2,
      height: 3,
    });
    expect(files.getReferenceMetadata).toHaveBeenCalledWith(
      reference.externalReference
    );
  });

  it('rejects destination permission before resolving the staged reference', async () => {
    auth.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow('denied');
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });

  it('rejects an already-uploaded file that fails the destination policy', async () => {
    attachments.matchesBucketPolicy.mockReturnValue(false);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
  });

  it('does not substitute a missing media reference', async () => {
    files.getReferenceMetadata.mockResolvedValue(null);
    await expect(
      service.existingMedia(room, actor, reference as any)
    ).rejects.toThrow();
  });
});

describe('who may attach a file to a room message', () => {
  const SPACE = 'space-1';
  const credential = (type: AuthorizationCredential, resourceID = '') => ({
    type,
    resourceID,
  });
  const actorWith = (
    actorID: string,
    ...credentials: { type: AuthorizationCredential; resourceID: string }[]
  ) => {
    const context = new ActorContext();
    context.actorID = actorID;
    context.credentials = credentials;
    return context;
  };
  const member = actorWith(
    'member',
    credential(AuthorizationCredential.GLOBAL_REGISTERED),
    credential(AuthorizationCredential.SPACE_MEMBER, SPACE)
  );
  const admin = actorWith(
    'admin',
    credential(AuthorizationCredential.GLOBAL_REGISTERED),
    credential(AuthorizationCredential.SPACE_ADMIN, SPACE)
  );
  const registeredOnly = actorWith(
    'outsider',
    credential(AuthorizationCredential.GLOBAL_REGISTERED)
  );

  const rule = (
    name: string,
    grantedPrivileges: AuthorizationPrivilege[],
    ...criterias: { type: AuthorizationCredential; resourceID: string }[]
  ) => ({ name, grantedPrivileges, criterias, cascade: true });
  const crudGrant = [
    AuthorizationPrivilege.CREATE,
    AuthorizationPrivilege.READ,
    AuthorizationPrivilege.UPDATE,
    AuthorizationPrivilege.DELETE,
    AuthorizationPrivilege.GRANT,
  ];

  // The rules the space's shared bucket carries: members and registered users
  // read, only admins write, so the contributor upload rule never fires for a
  // member.
  const spaceBucketPolicy = () => {
    const policy = new AuthorizationPolicy(
      AuthorizationPolicyType.STORAGE_BUCKET
    );
    policy.id = 'space-bucket-policy';
    policy.credentialRules = [
      rule(
        'spaceMembersRead',
        [AuthorizationPrivilege.READ],
        credential(AuthorizationCredential.SPACE_MEMBER, SPACE)
      ),
      rule(
        'spaceAdmins',
        crudGrant,
        credential(AuthorizationCredential.SPACE_ADMIN, SPACE)
      ),
      rule(
        'global-registered',
        [AuthorizationPrivilege.READ],
        credential(AuthorizationCredential.GLOBAL_REGISTERED)
      ),
    ] as any;
    policy.privilegeRules = [
      {
        name: POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
        sourcePrivilege: AuthorizationPrivilege.UPDATE,
        grantedPrivileges: [AuthorizationPrivilege.FILE_UPLOAD],
      },
      {
        name: POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
        sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
        grantedPrivileges: [AuthorizationPrivilege.FILE_UPLOAD],
      },
    ] as any;
    return policy;
  };

  // A callout comment room: members contribute, which lets them comment and
  // reply; registered users outside the space only read.
  const commentRoomPolicy = () => {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.ROOM);
    policy.id = 'room-policy';
    policy.credentialRules = [
      rule(
        'spaceMembersContribute',
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
        credential(AuthorizationCredential.SPACE_MEMBER, SPACE)
      ),
      rule(
        'spaceAdmins',
        crudGrant,
        credential(AuthorizationCredential.SPACE_ADMIN, SPACE)
      ),
      rule(
        'global-registered',
        [AuthorizationPrivilege.READ],
        credential(AuthorizationCredential.GLOBAL_REGISTERED)
      ),
    ] as any;
    policy.privilegeRules = [
      {
        name: POLICY_RULE_ROOM_CONTRIBUTE,
        sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
        grantedPrivileges: [
          AuthorizationPrivilege.CREATE_MESSAGE,
          AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
        ],
      },
      {
        name: 'roomAdmins',
        sourcePrivilege: AuthorizationPrivilege.CREATE,
        grantedPrivileges: [
          AuthorizationPrivilege.CREATE_MESSAGE,
          AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
        ],
      },
    ] as any;
    return policy;
  };

  const attachments = {
    getTargetBucketForRoom: vi.fn(),
    matchesBucketPolicy: vi.fn(),
  };
  const files = { getReferenceMetadata: vi.fn() };
  let service: RoomAttachmentSendService;

  beforeEach(() => {
    vi.resetAllMocks();
    const logger = { verbose: vi.fn(), debug: vi.fn(), warn: vi.fn() };
    service = new RoomAttachmentSendService(
      attachments as any,
      files as any,
      new AuthorizationService(logger as any)
    );
    attachments.getTargetBucketForRoom.mockResolvedValue({
      id: 'space-bucket',
      authorization: spaceBucketPolicy(),
    });
    attachments.matchesBucketPolicy.mockReturnValue(true);
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'image/png',
      size: 5,
    });
  });

  const commentRoom = (type: RoomType) =>
    ({ id: 'room-1', type, authorization: commentRoomPolicy() }) as any;

  it.each([
    RoomType.CALLOUT,
    RoomType.POST,
  ])('lets a plain member attach an image to a comment in a %s room', async type => {
    await expect(
      service.existingMedia(commentRoom(type), member, reference as any)
    ).resolves.toMatchObject({ media_id: reference.externalReference });
  });

  it('lets a plain member attach an image to a reply', async () => {
    await expect(
      service.existingMedia(
        commentRoom(RoomType.CALLOUT),
        member,
        reference as any,
        '$thread'
      )
    ).resolves.toMatchObject({ media_id: reference.externalReference });
  });

  it('lets a space admin attach an image to a comment', async () => {
    await expect(
      service.existingMedia(
        commentRoom(RoomType.CALLOUT),
        admin,
        reference as any
      )
    ).resolves.toMatchObject({ media_id: reference.externalReference });
  });

  it('refuses a registered user who may only read the comments', async () => {
    await expect(
      service.existingMedia(
        commentRoom(RoomType.CALLOUT),
        registeredOnly,
        reference as any
      )
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });

  it('checks the reply right for a reply', async () => {
    const room = commentRoom(RoomType.CALLOUT);
    room.authorization.privilegeRules = [
      {
        name: POLICY_RULE_ROOM_CONTRIBUTE,
        sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
        grantedPrivileges: [AuthorizationPrivilege.CREATE_MESSAGE],
      },
    ];
    await expect(
      service.existingMedia(room, member, reference as any)
    ).resolves.toBeDefined();
    await expect(
      service.existingMedia(room, member, reference as any, '$thread')
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
  });

  it('still requires the upload right on a conversation bucket', async () => {
    const conversationRoom = {
      id: 'room-2',
      type: RoomType.CONVERSATION_DIRECT,
      authorization: commentRoomPolicy(),
    } as any;
    await expect(
      service.existingMedia(conversationRoom, member, reference as any)
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
  });
});
