import {
  POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
  POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
} from '@common/constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomAttachmentSendService } from './room.attachment.send';

const actor = { actorID: '11111111-1111-4111-8111-111111111111' } as any;
const room = {
  id: '22222222-2222-4222-8222-222222222222',
  type: RoomType.CONVERSATION_DIRECT,
} as any;
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

describe('which bucket right an attachment send requires', () => {
  const SPACE = 'space-1';
  const credential = (type: AuthorizationCredential, resourceID = '') => ({
    type,
    resourceID,
  });
  const member = new ActorContext();
  member.actorID = 'member';
  member.credentials = [
    credential(AuthorizationCredential.GLOBAL_REGISTERED),
    credential(AuthorizationCredential.SPACE_MEMBER, SPACE),
  ];

  const rule = (
    name: string,
    grantedPrivileges: AuthorizationPrivilege[],
    ...criterias: { type: AuthorizationCredential; resourceID: string }[]
  ) => ({ name, grantedPrivileges, criterias, cascade: true });

  // A bucket on which the member reads but holds no upload right, plus the
  // privilege rules that would derive one from UPDATE or CONTRIBUTE.
  const bucketPolicy = (memberPrivileges: AuthorizationPrivilege[]) => {
    const policy = new AuthorizationPolicy(
      AuthorizationPolicyType.STORAGE_BUCKET
    );
    policy.id = 'bucket-policy';
    policy.credentialRules = [
      rule(
        'spaceMembers',
        memberPrivileges,
        credential(AuthorizationCredential.SPACE_MEMBER, SPACE)
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
  const readOnlyBucket = () => ({
    id: 'bucket',
    authorization: bucketPolicy([AuthorizationPrivilege.READ]),
  });

  const roomOf = (type: RoomType) =>
    ({
      id: 'room-1',
      type,
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.ROOM),
    }) as any;

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
    attachments.matchesBucketPolicy.mockReturnValue(true);
    files.getReferenceMetadata.mockResolvedValue({
      mimeType: 'image/png',
      size: 5,
    });
  });

  it.each([
    RoomType.CONVERSATION_DIRECT,
    RoomType.CONVERSATION_GROUP,
  ])('refuses a %s attachment without the upload right on the bucket', async type => {
    attachments.getTargetBucketForRoom.mockResolvedValue(readOnlyBucket());
    await expect(
      service.existingMedia(roomOf(type), member, reference as any)
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });

  it('accepts a conversation attachment with the upload right on the bucket', async () => {
    attachments.getTargetBucketForRoom.mockResolvedValue({
      id: 'bucket',
      authorization: bucketPolicy([
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.CONTRIBUTE,
      ]),
    });
    await expect(
      service.existingMedia(
        roomOf(RoomType.CONVERSATION_DIRECT),
        member,
        reference as any
      )
    ).resolves.toMatchObject({ media_id: reference.externalReference });
  });

  it.each([
    RoomType.CALLOUT,
    RoomType.POST,
  ])('does not require the bucket upload right in a %s comment room', async type => {
    const bucket = readOnlyBucket();
    attachments.getTargetBucketForRoom.mockResolvedValue(bucket);
    await expect(
      service.existingMedia(roomOf(type), member, reference as any)
    ).resolves.toMatchObject({ media_id: reference.externalReference });
    expect(attachments.matchesBucketPolicy).toHaveBeenCalledWith(
      bucket,
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });

  it('rejects a room without a target bucket as invalid', async () => {
    attachments.getTargetBucketForRoom.mockResolvedValue(undefined);
    await expect(
      service.existingMedia(roomOf(RoomType.CALLOUT), member, reference as any)
    ).rejects.toThrow(ValidationException);
    expect(files.getReferenceMetadata).not.toHaveBeenCalled();
  });
});
