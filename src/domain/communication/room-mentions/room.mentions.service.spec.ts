import { RoomType } from '@common/enums/room.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { Mention, MentionedEntityType } from '../messaging/mention.interface';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { VirtualContributorMessageService } from '../virtual.contributor.message/virtual.contributor.message.service';
import { RoomMentionsService } from './room.mentions.service';

describe('RoomMentionsService', () => {
  let service: RoomMentionsService;
  let notificationUserAdapter: Mocked<NotificationUserAdapter>;
  let notificationOrganizationAdapter: Mocked<NotificationOrganizationAdapter>;
  let communityResolverService: Mocked<CommunityResolverService>;
  let roomLookupService: Mocked<RoomLookupService>;
  let virtualContributorMessageService: Mocked<VirtualContributorMessageService>;
  let virtualActorLookupService: Mocked<VirtualActorLookupService>;
  let userLookupService: Mocked<UserLookupService>;
  let organizationLookupService: Mocked<OrganizationLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomMentionsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomMentionsService);
    notificationUserAdapter = module.get(NotificationUserAdapter);
    notificationOrganizationAdapter = module.get(
      NotificationOrganizationAdapter
    );
    communityResolverService = module.get(CommunityResolverService);
    roomLookupService = module.get(RoomLookupService);
    virtualContributorMessageService = module.get(
      VirtualContributorMessageService
    );
    virtualActorLookupService = module.get(VirtualActorLookupService);
    userLookupService = module.get(UserLookupService);
    organizationLookupService = module.get(OrganizationLookupService);
  });

  describe('getMentionsFromText', () => {
    it('should return empty array when text has no mentions', async () => {
      const result = await service.getMentionsFromText('no mentions here');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', async () => {
      const result = await service.getMentionsFromText('');

      expect(result).toEqual([]);
    });

    it('should extract user mention from text', async () => {
      const mockUser = { id: 'user-uuid-1' } as any;
      userLookupService.getUserByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockUser);

      const result = await service.getMentionsFromText(
        'Hey, [@john-doe](https://example.com/user/john-doe) check this'
      );

      expect(result).toEqual([
        {
          actorId: 'user-uuid-1',
          actorType: MentionedEntityType.USER,
        },
      ]);
    });

    it('should extract organization mention from text', async () => {
      const mockOrg = { id: 'org-uuid-1' } as any;
      organizationLookupService.getOrganizationByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockOrg);

      const result = await service.getMentionsFromText(
        'See [@acme-corp](https://example.com/organization/acme-corp) for details'
      );

      expect(result).toEqual([
        {
          actorId: 'org-uuid-1',
          actorType: MentionedEntityType.ORGANIZATION,
        },
      ]);
    });

    it('should extract virtual contributor mention from text', async () => {
      const mockVC = { id: 'vc-uuid-1' } as any;
      virtualActorLookupService.getVirtualContributorByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockVC);

      const result = await service.getMentionsFromText(
        'Ask [@my-vc](https://example.com/vc/my-vc) about this'
      );

      expect(result).toEqual([
        {
          actorId: 'vc-uuid-1',
          actorType: MentionedEntityType.VIRTUAL,
        },
      ]);
    });

    it('should extract multiple mentions of different types', async () => {
      const mockUser = { id: 'user-uuid-1' } as any;
      const mockOrg = { id: 'org-uuid-1' } as any;

      userLookupService.getUserByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockUser);
      organizationLookupService.getOrganizationByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockOrg);

      const text =
        'Hey, [@john](https://example.com/user/john-doe) and [@acme](https://example.com/organization/acme-corp)';
      const result = await service.getMentionsFromText(text);

      expect(result).toHaveLength(2);
      expect(result[0].actorType).toBe(MentionedEntityType.USER);
      expect(result[1].actorType).toBe(MentionedEntityType.ORGANIZATION);
    });

    it('should handle mentions with http protocol', async () => {
      const mockUser = { id: 'user-uuid-1' } as any;
      userLookupService.getUserByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockUser);

      const result = await service.getMentionsFromText(
        'Hey, [@john](http://example.com/user/john-doe) check this'
      );

      expect(result).toEqual([
        {
          actorId: 'user-uuid-1',
          actorType: MentionedEntityType.USER,
        },
      ]);
    });

    it('should handle mentions with port in URL', async () => {
      const mockUser = { id: 'user-uuid-1' } as any;
      userLookupService.getUserByNameIdOrFail = vi
        .fn()
        .mockResolvedValue(mockUser);

      const result = await service.getMentionsFromText(
        'Hey, [@john](http://localhost:3000/user/john-doe) check this'
      );

      expect(result).toEqual([
        {
          actorId: 'user-uuid-1',
          actorType: MentionedEntityType.USER,
        },
      ]);
    });
  });

  describe('getVcInteractionByThread', () => {
    it('should return VC interaction when found in room JSON', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'vc-agent-1' },
        },
      } as any;
      roomLookupService.getRoomOrFail.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractionByThread(
        'room-1',
        'thread-1'
      );

      expect(result).toEqual({
        threadID: 'thread-1',
        virtualContributorID: 'vc-agent-1',
      });
    });

    it('should return undefined when thread has no VC interaction', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: {},
      } as any;
      roomLookupService.getRoomOrFail.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractionByThread(
        'room-1',
        'thread-1'
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when vcInteractionsByThread is null', async () => {
      const mockRoom = {
        id: 'room-1',
        vcInteractionsByThread: null,
      } as any;
      roomLookupService.getRoomOrFail.mockResolvedValue(mockRoom);

      const result = await service.getVcInteractionByThread(
        'room-1',
        'thread-1'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('processVirtualContributorMentions', () => {
    const mockRoom = {
      id: 'room-1',
      type: RoomType.CALLOUT,
    } as unknown as IRoom;

    const mockActorContext = {
      actorId: 'user-1',
    } as ActorContext;

    beforeEach(() => {
      communityResolverService.getCommunityFromRoom.mockResolvedValue({
        roleSet: { id: 'roleset-1' },
      } as any);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
      } as any);
    });

    it('should create VC interaction and invoke VC for first mention in thread', async () => {
      const vcMentions: Mention[] = [
        {
          actorId: 'vc-entity-1',
          actorType: MentionedEntityType.VIRTUAL,
        },
      ];

      // No existing interaction
      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {},
      } as any);

      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-entity-1',
        } as any
      );

      roomLookupService.addVcInteractionToRoom.mockResolvedValue({
        threadID: 'thread-1',
        virtualContributorID: 'vc-entity-1',
      });

      await service.processVirtualContributorMentions(
        vcMentions,
        'Hello VC',
        'thread-1',
        mockActorContext,
        mockRoom
      );

      expect(roomLookupService.addVcInteractionToRoom).toHaveBeenCalledWith({
        virtualContributorActorID: 'vc-entity-1',
        roomID: 'room-1',
        threadID: 'thread-1',
      });
      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).toHaveBeenCalledWith(
        'vc-entity-1',
        'Hello VC',
        'thread-1',
        mockActorContext,
        'space-1',
        mockRoom
      );
    });

    it('should skip non-VC mentions', async () => {
      const mentions: Mention[] = [
        {
          actorId: 'user-1',
          actorType: MentionedEntityType.USER,
        },
        {
          actorId: 'org-1',
          actorType: MentionedEntityType.ORGANIZATION,
        },
      ];

      // No existing interaction
      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {},
      } as any);

      await service.processVirtualContributorMentions(
        mentions,
        'Hello',
        'thread-1',
        mockActorContext,
        mockRoom
      );

      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).not.toHaveBeenCalled();
    });

    it('should reuse existing VC interaction for subsequent mentions in same thread', async () => {
      const vcMentions: Mention[] = [
        {
          actorId: 'vc-entity-1',
          actorType: MentionedEntityType.VIRTUAL,
        },
      ];

      // Existing interaction
      roomLookupService.getRoomOrFail.mockResolvedValue({
        id: 'room-1',
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'vc-agent-1' },
        },
      } as any);

      await service.processVirtualContributorMentions(
        vcMentions,
        'Another message',
        'thread-1',
        mockActorContext,
        mockRoom
      );

      // Should NOT create a new interaction
      expect(roomLookupService.addVcInteractionToRoom).not.toHaveBeenCalled();
      // Should still invoke the VC
      expect(
        virtualContributorMessageService.invokeVirtualContributor
      ).toHaveBeenCalledWith(
        'vc-agent-1',
        'Another message',
        'thread-1',
        mockActorContext,
        'space-1',
        mockRoom
      );
    });
  });

  describe('processNotificationMentions', () => {
    const mockRoom = { id: 'room-1' } as unknown as IRoom;
    const mockMessage: IMessage = {
      id: 'msg-1',
      message: 'Hello',
      sender: 'agent-1',
      timestamp: Date.now(),
      reactions: [],
    };
    const mockActorContext = { actorId: 'user-1' } as ActorContext;

    it('should send user mention notification for USER type mentions', async () => {
      const mentions: Mention[] = [
        {
          actorId: 'user-uuid-1',
          actorType: MentionedEntityType.USER,
        },
      ];

      await service.processNotificationMentions(
        mentions,
        mockRoom,
        mockMessage,
        mockActorContext
      );

      expect(notificationUserAdapter.userMention).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        userID: 'user-uuid-1',
        roomID: 'room-1',
        messageID: 'msg-1',
      });
    });

    it('should send organization mention notification for ORGANIZATION type mentions', async () => {
      const mentions: Mention[] = [
        {
          actorId: 'org-uuid-1',
          actorType: MentionedEntityType.ORGANIZATION,
        },
      ];

      await service.processNotificationMentions(
        mentions,
        mockRoom,
        mockMessage,
        mockActorContext
      );

      expect(
        notificationOrganizationAdapter.organizationMention
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        organizationID: 'org-uuid-1',
        roomID: 'room-1',
        messageID: 'msg-1',
      });
    });

    it('should handle mixed mention types', async () => {
      const mentions: Mention[] = [
        {
          actorId: 'user-uuid-1',
          actorType: MentionedEntityType.USER,
        },
        {
          actorId: 'org-uuid-1',
          actorType: MentionedEntityType.ORGANIZATION,
        },
      ];

      await service.processNotificationMentions(
        mentions,
        mockRoom,
        mockMessage,
        mockActorContext
      );

      expect(notificationUserAdapter.userMention).toHaveBeenCalledTimes(1);
      expect(
        notificationOrganizationAdapter.organizationMention
      ).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when mentions array is empty', async () => {
      await service.processNotificationMentions(
        [],
        mockRoom,
        mockMessage,
        mockActorContext
      );

      expect(notificationUserAdapter.userMention).not.toHaveBeenCalled();
      expect(
        notificationOrganizationAdapter.organizationMention
      ).not.toHaveBeenCalled();
    });
  });

  describe('getSpaceIdForRoom', () => {
    it('should resolve space ID from room via community and role set', async () => {
      const mockRoom = {
        id: 'room-1',
        type: RoomType.CALLOUT,
      } as unknown as IRoom;

      communityResolverService.getCommunityFromRoom.mockResolvedValue({
        roleSet: { id: 'roleset-1' },
      } as any);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
      } as any);

      const result = await service.getSpaceIdForRoom(mockRoom);

      expect(result).toBe('space-1');
      expect(
        communityResolverService.getCommunityFromRoom
      ).toHaveBeenCalledWith('room-1', RoomType.CALLOUT);
      expect(
        communityResolverService.getSpaceForRoleSetOrFail
      ).toHaveBeenCalledWith('roleset-1');
    });
  });
});
