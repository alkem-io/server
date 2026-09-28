import { ActorType } from '@common/enums/actor.type';
import { CONVERSATION_MEDIA_ALLOWED_MIME_TYPES } from '@common/enums/mime.file.type';
import { RoomType } from '@common/enums/room.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
import { CONVERSATION_MEDIA_MAX_FILE_SIZE } from './conversation.media.constants';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let roomService: Mocked<RoomService>;
  let roomAuthorizationService: Mocked<RoomAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let userLookupService: Mocked<UserLookupService>;
  let virtualActorLookupService: Mocked<VirtualActorLookupService>;
  let platformWellKnownVCService: Mocked<PlatformWellKnownVirtualContributorsService>;
  let storageAggregatorService: Mocked<StorageAggregatorService>;
  let storageAggregatorResolverService: Mocked<StorageAggregatorResolverService>;
  let storageBucketService: Mocked<StorageBucketService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let conversationRepo: Mocked<Repository<Conversation>>;
  let membershipRepo: Mocked<Repository<ConversationMembership>>;
  let eventEmitter: Mocked<EventEmitter2>;
  let mockManagerFind: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static Conversation.create to avoid DataSource requirement
    vi.spyOn(Conversation, 'create').mockImplementation((input: any) => {
      const entity = new Conversation();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        repositoryProviderMockFactory(Conversation),
        repositoryProviderMockFactory(ConversationMembership),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversationService);
    roomService = module.get(RoomService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    userLookupService = module.get(UserLookupService);
    virtualActorLookupService = module.get(VirtualActorLookupService);
    platformWellKnownVCService = module.get(
      PlatformWellKnownVirtualContributorsService
    );
    storageAggregatorService = module.get(StorageAggregatorService);
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
    storageBucketService = module.get(StorageBucketService);
    communicationAdapter = module.get(CommunicationAdapter);
    conversationRepo = module.get(getRepositoryToken(Conversation));
    membershipRepo = module.get(getRepositoryToken(ConversationMembership));
    eventEmitter = module.get(EventEmitter2);

    // Mock the manager.find used by getConversationMembers to batch-lookup actor types
    mockManagerFind = vi.fn().mockResolvedValue([]);
    (membershipRepo as any).manager = { find: mockManagerFind };
  });

  describe('getConversationOrFail', () => {
    it('should return conversation when found', async () => {
      const mockConversation = { id: 'conv-1' } as Conversation;
      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.getConversationOrFail('conv-1');

      expect(result).toBe(mockConversation);
      expect(conversationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
    });

    it('should throw EntityNotFoundException when conversation not found', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(service.getConversationOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass FindOneOptions through to repository', async () => {
      const options = { relations: { room: true } };
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
      } as Conversation);

      await service.getConversationOrFail('conv-1', options);

      expect(conversationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        relations: { room: true },
      });
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation with room and authorization', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.remove.mockResolvedValue({
        ...mockConversation,
        id: '',
      } as Conversation);

      const result = await service.deleteConversation('conv-1');

      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockConversation.authorization
      );
      expect(conversationRepo.remove).toHaveBeenCalled();
      expect(result.id).toBe('conv-1');
    });

    it('deletes the storage aggregator explicitly BEFORE remove (single path, no double-delete)', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
        storageAggregator: { id: 'agg-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.remove.mockResolvedValue({
        ...mockConversation,
        id: '',
      } as Conversation);

      await service.deleteConversation('conv-1');

      // FIX 5: aggregator deleted explicitly (cleans its bucket + docs + auth)…
      expect(storageAggregatorService.delete).toHaveBeenCalledWith('agg-1');
      // …exactly once (remove no longer cascade-deletes it) …
      expect(storageAggregatorService.delete).toHaveBeenCalledTimes(1);
      // …and the in-memory reference is detached before removing the conversation
      // so the cascade cannot revisit the already-removed aggregator.
      expect(mockConversation.storageAggregator).toBeUndefined();
      expect(conversationRepo.remove).toHaveBeenCalled();
    });

    it('B1: a failed storage teardown leaves the conversation ROOM and AUTHORIZATION intact, so the delete stays retryable', async () => {
      // storageAggregatorService.delete is a fallible, multi-step REMOTE teardown
      // (one file-service call per document), so it must run before anything
      // that destroys the conversation row:
      //  * deleting the authorization first left the row alive with a NULL
      //    authorizationId — nothing could authorize a retry;
      //  * deleting the ROOM first cascade-deleted the conversation row itself
      //    (Conversation.room is a FK with onDelete: CASCADE), stranding the
      //    bucket + every attachment with no row left to retry from.
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
        storageAggregator: { id: 'agg-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);
      storageAggregatorService.delete.mockRejectedValue(
        new Error('file-service unavailable')
      );

      await expect(service.deleteConversation('conv-1')).rejects.toThrow(
        'file-service unavailable'
      );

      expect(roomService.deleteRoom).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(conversationRepo.remove).not.toHaveBeenCalled();
    });

    it('tears the remote storage down BEFORE the cascade-deleting room delete', async () => {
      const order: string[] = [];
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
        storageAggregator: { id: 'agg-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.remove.mockResolvedValue({
        ...mockConversation,
        id: '',
      } as Conversation);
      storageAggregatorService.delete.mockImplementation(async () => {
        order.push('storage');
        return undefined as any;
      });
      roomService.deleteRoom.mockImplementation(async () => {
        order.push('room');
        return undefined as any;
      });

      await service.deleteConversation('conv-1');

      expect(order).toEqual(['storage', 'room']);
    });

    it('should throw EntityNotInitializedException when room is missing', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      await expect(service.deleteConversation('conv-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotInitializedException when authorization is missing', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1' },
        authorization: undefined,
        messaging: { id: 'messaging-1' },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      await expect(service.deleteConversation('conv-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotInitializedException when messaging is missing', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1' },
        authorization: { id: 'auth-1' },
        messaging: undefined,
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      await expect(service.deleteConversation('conv-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getRoom', () => {
    it('should return room when conversation has a room', async () => {
      const mockRoom = { id: 'room-1', type: RoomType.CONVERSATION_DIRECT };
      const mockConversation = {
        id: 'conv-1',
        room: mockRoom,
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.getRoom('conv-1');

      expect(result).toBe(mockRoom);
    });

    it('should return undefined when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.getRoom('conv-1');

      expect(result).toBeUndefined();
    });
  });

  describe('getCommentsCount', () => {
    it('should return messagesCount when room exists', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-1', messagesCount: 42 },
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.getCommentsCount('conv-1');

      expect(result).toBe(42);
    });

    it('should return 0 when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as Conversation;

      conversationRepo.findOne.mockResolvedValue(mockConversation);

      const result = await service.getCommentsCount('conv-1');

      expect(result).toBe(0);
    });
  });

  describe('isConversationMember', () => {
    it('should return true when agent is a member', async () => {
      membershipRepo.count.mockResolvedValue(1);

      const result = await service.isConversationMember('conv-1', 'agent-1');

      expect(result).toBe(true);
      expect(membershipRepo.count).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1', actorID: 'agent-1' },
      });
    });

    it('should return false when agent is not a member', async () => {
      membershipRepo.count.mockResolvedValue(0);

      const result = await service.isConversationMember('conv-1', 'agent-1');

      expect(result).toBe(false);
    });
  });

  describe('addMember (sec-server-1: consent gate)', () => {
    const conversationId = 'conv-1';
    const memberActorId = 'actor-c';

    const mockGroupConversation = () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
      } as any);
      membershipRepo.count.mockResolvedValue(0); // isConversationMember -> false
    };

    it('adds a consenting user and sends the batchAddMember RPC', async () => {
      mockGroupConversation();
      userLookupService.getUserById.mockResolvedValue({
        id: memberActorId,
        settings: {
          communication: { allowOtherUsersToSendMessages: true },
        },
      } as any);
      communicationAdapter.batchAddMember.mockResolvedValue(true as any);

      const result = await service.addMember(conversationId, memberActorId);

      expect(result.id).toBe(conversationId);
      expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith(
        memberActorId,
        ['room-1']
      );
    });

    it('throws MessagingNotEnabledException and never sends the RPC when the user does not consent to receiving messages', async () => {
      mockGroupConversation();
      userLookupService.getUserById.mockResolvedValue({
        id: memberActorId,
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      } as any);

      await expect(
        service.addMember(conversationId, memberActorId)
      ).rejects.toThrow('User is not open to receiving messages');
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    });

    it('exempts non-USER actors (e.g. a Virtual Contributor, no settings row) from the consent check', async () => {
      mockGroupConversation();
      userLookupService.getUserById.mockResolvedValue(null);
      communicationAdapter.batchAddMember.mockResolvedValue(true as any);

      await service.addMember(conversationId, memberActorId);

      expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith(
        memberActorId,
        ['room-1']
      );
    });

    it('is idempotent — an already-present member is returned without a consent check or RPC', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
      } as any);
      membershipRepo.count.mockResolvedValue(1); // already a member

      const result = await service.addMember(conversationId, memberActorId);

      expect(result.id).toBe(conversationId);
      expect(userLookupService.getUserById).not.toHaveBeenCalled();
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    });

    it('sec-server-10: throws ValidationException and never sends the RPC once the group is at the member cap', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
      } as any);
      membershipRepo.count
        .mockResolvedValueOnce(0) // isConversationMember -> not yet a member
        .mockResolvedValueOnce(100); // current total membership == cap

      await expect(
        service.addMember(conversationId, memberActorId)
      ).rejects.toThrow(
        'Group conversation has reached the maximum member count'
      );
      expect(userLookupService.getUserById).not.toHaveBeenCalled();
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember (US2-AS4 live-verification fix)', () => {
    const conversationId = 'conv-1';
    const memberActorId = 'actor-c';

    const mockGroupConversation = () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
      } as any);
      membershipRepo.count.mockResolvedValue(1); // isConversationMember -> true
    };

    const matrixKickRejected = () =>
      CommunicationAdapterException.fromAdapterError('batchRemoveMember', {
        code: 'NOT_ALLOWED',
        message: 'insufficient power level',
      });

    it('should send the batchRemoveMember RPC with ensureAllSucceeded and return the conversation on success', async () => {
      mockGroupConversation();
      communicationAdapter.batchRemoveMember.mockResolvedValue(true);

      const result = await service.removeMember(conversationId, memberActorId);

      expect(result.id).toBe(conversationId);
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
        memberActorId,
        ['room-1'],
        undefined,
        { ensureAllSucceeded: true }
      );
    });

    it('sec-server-11: falls back to authoritative local removal (never throws) when Matrix rejects the kick', async () => {
      mockGroupConversation();
      communicationAdapter.batchRemoveMember.mockRejectedValue(
        matrixKickRejected()
      );
      eventEmitter.emitAsync.mockResolvedValue([undefined]); // one listener ran

      const result = await service.removeMember(conversationId, memberActorId);

      expect(result.id).toBe(conversationId);
      // The removal is completed through the SAME workflow the
      // Matrix-confirmed path uses (persist + auth re-apply + MEMBER_REMOVED
      // + last-member conversation deletion), not by deleting the row behind
      // the event handler's back.
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'room.member.updated',
        expect.objectContaining({
          payload: expect.objectContaining({
            roomId: 'room-1',
            memberActorID: memberActorId,
            membership: 'leave',
          }),
        })
      );
      expect(membershipRepo.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['the completion workflow fails', () => new Error('listener blew up')],
      ['no listener is registered at all', () => undefined],
    ])('sec-server-11: still removes the membership row when %s', async (_case, failure) => {
      mockGroupConversation();
      communicationAdapter.batchRemoveMember.mockRejectedValue(
        matrixKickRejected()
      );
      const error = failure();
      if (error) eventEmitter.emitAsync.mockRejectedValue(error);
      else eventEmitter.emitAsync.mockResolvedValue([]);
      membershipRepo.delete.mockResolvedValue({} as any);

      const result = await service.removeMember(conversationId, memberActorId);

      expect(result.id).toBe(conversationId);
      expect(membershipRepo.delete).toHaveBeenCalledWith({
        conversationId,
        actorID: memberActorId,
      });
    });

    it('sec-server-11: propagates a non-adapter error (e.g. a transport/programming error) rather than swallowing it', async () => {
      mockGroupConversation();
      const unexpected = new Error('unexpected failure');
      communicationAdapter.batchRemoveMember.mockRejectedValue(unexpected);

      await expect(
        service.removeMember(conversationId, memberActorId)
      ).rejects.toThrow(unexpected);
      expect(membershipRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationException when the conversation is not a group', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
      } as any);

      await expect(
        service.removeMember(conversationId, memberActorId)
      ).rejects.toThrow(ValidationException);
      expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
    });

    it('should throw ValidationException when the actor is not a member', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: conversationId,
        room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
      } as any);
      membershipRepo.count.mockResolvedValue(0);

      await expect(
        service.removeMember(conversationId, memberActorId)
      ).rejects.toThrow(ValidationException);
      expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
    });
  });

  describe('getVCFromConversation', () => {
    it('should return VC when conversation has a VC member', async () => {
      const mockVC = { id: 'agent-vc' } as any;
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-user' },
        { conversationId: 'conv-1', actorID: 'agent-vc' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-user', type: ActorType.USER },
        { id: 'agent-vc', type: ActorType.VIRTUAL_CONTRIBUTOR },
      ]);
      virtualActorLookupService.getVirtualContributorById.mockResolvedValue(
        mockVC
      );

      const result = await service.getVCFromConversation('conv-1');

      expect(result).toBe(mockVC);
      expect(
        virtualActorLookupService.getVirtualContributorById
      ).toHaveBeenCalledWith('agent-vc');
    });

    it('should return null when conversation has no VC member', async () => {
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
        { conversationId: 'conv-1', actorID: 'agent-2' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
        { id: 'agent-2', type: ActorType.USER },
      ]);

      const result = await service.getVCFromConversation('conv-1');

      expect(result).toBeNull();
      expect(
        virtualActorLookupService.getVirtualContributorById
      ).not.toHaveBeenCalled();
    });
  });

  describe('getUserFromConversation', () => {
    it('should return user when conversation has a user member', async () => {
      const mockUser = { id: 'user-1' } as any;
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-user' },
        { conversationId: 'conv-1', actorID: 'agent-vc' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-user', type: ActorType.USER },
        { id: 'agent-vc', type: ActorType.VIRTUAL_CONTRIBUTOR },
      ]);
      userLookupService.getUserById.mockResolvedValue(mockUser);

      const result = await service.getUserFromConversation('conv-1');

      expect(result).toBe(mockUser);
    });

    it('should exclude specified actor when excludeActorId is provided', async () => {
      const mockUser2 = { id: 'user-2' } as any;
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
        { conversationId: 'conv-1', actorID: 'agent-2' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
        { id: 'agent-2', type: ActorType.USER },
      ]);
      userLookupService.getUserById.mockResolvedValue(mockUser2);

      const result = await service.getUserFromConversation('conv-1', 'agent-1');

      expect(result).toBe(mockUser2);
      expect(userLookupService.getUserById).toHaveBeenCalledWith('agent-2');
    });

    it('should return null when no user member found after exclusion', async () => {
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
        { conversationId: 'conv-1', actorID: 'agent-vc' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
        { id: 'agent-vc', type: ActorType.VIRTUAL_CONTRIBUTOR },
      ]);

      const result = await service.getUserFromConversation('conv-1', 'agent-1');

      expect(result).toBeNull();
    });
  });

  describe('getConversationParticipants', () => {
    it('should group members by type into users and virtualContributors', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockVC = { id: 'vc-1' } as any;

      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-user' },
        { conversationId: 'conv-1', actorID: 'agent-vc' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-user', type: ActorType.USER },
        { id: 'agent-vc', type: ActorType.VIRTUAL_CONTRIBUTOR },
      ]);

      userLookupService.getUserById.mockResolvedValue(mockUser);
      virtualActorLookupService.getVirtualContributorById.mockResolvedValue(
        mockVC
      );

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toEqual([mockUser]);
      expect(result.virtualContributors).toEqual([mockVC]);
    });

    it('should handle conversations with only users', async () => {
      const mockUser1 = { id: 'user-1' } as any;
      const mockUser2 = { id: 'user-2' } as any;

      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
        { conversationId: 'conv-1', actorID: 'agent-2' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
        { id: 'agent-2', type: ActorType.USER },
      ]);

      userLookupService.getUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toHaveLength(2);
      expect(result.virtualContributors).toHaveLength(0);
    });

    it('should skip members that cannot be resolved', async () => {
      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-user' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-user', type: ActorType.USER },
      ]);

      userLookupService.getUserById.mockResolvedValue(null as any);

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toHaveLength(0);
    });
  });

  describe('resetConversation', () => {
    it('should create new room before deleting the old one to prevent cascade deletion of conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-old' },
      } as unknown as IConversation;

      const newRoom = { id: 'room-new' } as any;
      const callOrder: string[] = [];

      roomService.createRoom.mockImplementation(async () => {
        callOrder.push('createRoom');
        return newRoom;
      });
      conversationRepo.save.mockImplementation(async (c: any) => {
        callOrder.push('save');
        return c;
      });
      roomService.deleteRoom.mockImplementation(async () => {
        callOrder.push('deleteRoom');
        return {} as IRoom;
      });

      await service.resetConversation(
        mockConversation,
        'sender-agent',
        'receiver-agent'
      );

      // New room must be created and conversation saved BEFORE the old room is deleted.
      // conversation.roomId FK has ON DELETE CASCADE — deleting the old room first
      // would cascade-delete the conversation row.
      expect(callOrder).toEqual(['createRoom', 'save', 'deleteRoom']);
      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-old',
      });
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: '',
        type: RoomType.CONVERSATION_DIRECT,
        senderActorID: 'sender-agent',
        receiverActorID: 'receiver-agent',
      });
    });

    it('should skip delete when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as IConversation;

      const newRoom = { id: 'room-new' } as any;
      roomService.createRoom.mockResolvedValue(newRoom);
      conversationRepo.save.mockResolvedValue({
        ...mockConversation,
        room: newRoom,
      } as Conversation);

      await service.resetConversation(
        mockConversation,
        'sender-agent',
        'receiver-agent'
      );

      expect(roomService.deleteRoom).not.toHaveBeenCalled();
      expect(roomService.createRoom).toHaveBeenCalled();
    });
  });

  describe('ensureRoomExists', () => {
    it('should return existing room when conversation already has one', async () => {
      const existingRoom = {
        id: 'room-1',
        type: RoomType.CONVERSATION_DIRECT,
      } as any;
      const mockConversation = {
        id: 'conv-1',
        room: existingRoom,
      } as unknown as IConversation;

      const result = await service.ensureRoomExists(mockConversation);

      expect(result).toBe(existingRoom);
      expect(roomService.createRoom).not.toHaveBeenCalled();
    });

    it('should return undefined when conversation has non-2 members', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as IConversation;

      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        authorization: { id: 'auth-1' },
      } as Conversation);

      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
      ]);

      const result = await service.ensureRoomExists(mockConversation);

      expect(result).toBeUndefined();
    });

    it('should create room and apply authorization when conversation has 2 members', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as IConversation;

      const authPolicy = { id: 'auth-1' };
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        authorization: authPolicy,
      } as unknown as Conversation);

      membershipRepo.find.mockResolvedValue([
        { conversationId: 'conv-1', actorID: 'agent-1' },
        { conversationId: 'conv-1', actorID: 'agent-2' },
      ] as any);
      mockManagerFind.mockResolvedValue([
        { id: 'agent-1', type: ActorType.USER },
        { id: 'agent-2', type: ActorType.USER },
      ]);

      const createdRoom = { id: 'room-new' } as any;
      roomService.createRoom.mockResolvedValue(createdRoom);
      conversationRepo.save.mockResolvedValue({} as Conversation);

      const mockRoomAuth = { id: 'room-auth' } as any;
      roomAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
        mockRoomAuth
      );
      roomAuthorizationService.allowContributorsToCreateMessages.mockReturnValue(
        mockRoomAuth
      );
      roomAuthorizationService.allowContributorsToReplyReactToMessages.mockReturnValue(
        mockRoomAuth
      );

      const result = await service.ensureRoomExists(mockConversation);

      expect(result).toBe(createdRoom);
      expect(roomService.createRoom).toHaveBeenCalled();
      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(createdRoom, authPolicy);
      expect(authorizationPolicyService.save).toHaveBeenCalledWith(
        mockRoomAuth
      );
    });
  });

  describe('getConversationMemberActorIds', () => {
    it('should return array of actor IDs from memberships', async () => {
      membershipRepo.find.mockResolvedValue([
        { actorID: 'agent-1' },
        { actorID: 'agent-2' },
      ] as any);

      const result = await service.getConversationMemberActorIds('conv-1');

      expect(result).toEqual(['agent-1', 'agent-2']);
    });

    it('should return empty array when no memberships exist', async () => {
      membershipRepo.find.mockResolvedValue([]);

      const result = await service.getConversationMemberActorIds('conv-1');

      expect(result).toEqual([]);
    });
  });

  describe('createConversation', () => {
    it('should create a DIRECT conversation with room and memberships', async () => {
      const savedConversation = { id: 'conv-new' } as Conversation;
      conversationRepo.save.mockResolvedValue(savedConversation);

      const mockRoom = { id: 'room-1' } as any;
      roomService.createRoom.mockResolvedValue(mockRoom);

      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockResolvedValue([] as any);

      const result = await service.createConversation(
        'agent-1',
        ['agent-2'],
        RoomType.CONVERSATION_DIRECT
      );

      expect(result).toBe(savedConversation);
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: '',
        type: RoomType.CONVERSATION_DIRECT,
        senderActorID: 'agent-1',
        receiverActorID: 'agent-2',
      });
    });

    it('should create a GROUP conversation with room and memberships', async () => {
      const savedConversation = { id: 'conv-new' } as Conversation;
      conversationRepo.save.mockResolvedValue(savedConversation);

      const mockRoom = { id: 'room-1' } as any;
      roomService.createRoom.mockResolvedValue(mockRoom);

      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockResolvedValue([] as any);

      const result = await service.createConversation(
        'agent-1',
        ['agent-2', 'agent-3'],
        RoomType.CONVERSATION_GROUP
      );

      expect(result).toBe(savedConversation);
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'group-conversation-3-members',
        type: RoomType.CONVERSATION_GROUP,
        memberActorIDs: ['agent-1', 'agent-2', 'agent-3'],
      });
    });

    it('should create membership records for all members', async () => {
      const savedConversation = { id: 'conv-new' } as Conversation;
      conversationRepo.save.mockResolvedValue(savedConversation);
      roomService.createRoom.mockResolvedValue({ id: 'room-1' } as any);
      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockResolvedValue([] as any);

      await service.createConversation(
        'agent-1',
        ['agent-2'],
        RoomType.CONVERSATION_DIRECT
      );

      expect(membershipRepo.create).toHaveBeenCalledWith({
        conversationId: 'conv-new',
        actorID: 'agent-1',
      });
      expect(membershipRepo.create).toHaveBeenCalledWith({
        conversationId: 'conv-new',
        actorID: 'agent-2',
      });
    });

    it('should deduplicate member IDs', async () => {
      const savedConversation = { id: 'conv-new' } as Conversation;
      conversationRepo.save.mockResolvedValue(savedConversation);
      roomService.createRoom.mockResolvedValue({ id: 'room-1' } as any);
      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockResolvedValue([] as any);

      await service.createConversation(
        'agent-1',
        ['agent-1', 'agent-2'],
        RoomType.CONVERSATION_GROUP
      );

      // creator 'agent-1' is deduplicated — only 2 memberships created
      expect(membershipRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationException when fewer than 2 unique members', async () => {
      await expect(
        service.createConversation(
          'agent-1',
          ['agent-1'],
          RoomType.CONVERSATION_DIRECT
        )
      ).rejects.toThrow(ValidationException);
    });

    it('rolls back the pre-created storage aggregator when a later step fails (FIX 1)', async () => {
      // Storage is created (own transaction) BEFORE the room RPC. If the room
      // RPC fails, the aggregator/bucket/auth must be rolled back — no orphan.
      storageAggregatorService.createStorageAggregator.mockResolvedValue({
        id: 'agg-1',
        directStorage: undefined,
      } as any);
      roomService.createRoom.mockRejectedValue(
        new Error('matrix room RPC failed')
      );

      await expect(
        service.createConversation(
          'agent-1',
          ['agent-2'],
          RoomType.CONVERSATION_DIRECT
        )
      ).rejects.toThrow('matrix room RPC failed');

      expect(storageAggregatorService.delete).toHaveBeenCalledWith('agg-1');
    });

    it('cleans up the aggregator when the bucket-policy save inside createConversationStorageAggregator fails (FIX 1)', async () => {
      // createStorageAggregator (step 1) has already committed the aggregator +
      // bucket + 2 auth rows. The SECOND step — tightening the bucket policy via
      // storageBucketService.save — then fails. This throws BEFORE the aggregator
      // is assigned to conversation.storageAggregator and BEFORE the outer
      // try/catch is entered, so the caller's rollback can't reach it. The method
      // must therefore clean up its own just-created aggregator (same
      // StorageAggregatorService.delete) so nothing leaks, then propagate.
      storageAggregatorService.createStorageAggregator.mockResolvedValue({
        id: 'agg-1',
        directStorage: { id: 'bucket-1' },
      } as any);
      storageBucketService.save.mockRejectedValue(
        new Error('bucket policy save failed')
      );

      await expect(
        service.createConversation(
          'agent-1',
          ['agent-2'],
          RoomType.CONVERSATION_DIRECT
        )
      ).rejects.toThrow('bucket policy save failed');

      // Cleaned up exactly once — the outer rollback never runs because the throw
      // happens before conversation.storageAggregator is assigned.
      expect(storageAggregatorService.delete).toHaveBeenCalledWith('agg-1');
      expect(storageAggregatorService.delete).toHaveBeenCalledTimes(1);
      // The room RPC is never reached — the failure is in storage creation.
      expect(roomService.createRoom).not.toHaveBeenCalled();
    });

    it('ALWAYS provisions the per-conversation storage, attached to the conversation before it is saved', async () => {
      // Unconditional by design (no feature flag): every new conversation gets
      // its StorageAggregator + media-policy bucket eagerly, so message
      // attachments have a membership-authorized home from the moment the
      // conversation exists. Pre-existing conversations are covered by the
      // 1782300000002 backfill.
      const platformAggregator = { id: 'platform-agg' } as any;
      storageAggregatorResolverService.getPlatformStorageAggregator.mockResolvedValue(
        platformAggregator
      );
      const bucket = { id: 'bucket-1' } as any;
      storageAggregatorService.createStorageAggregator.mockResolvedValue({
        id: 'agg-1',
        directStorage: bucket,
      } as any);
      storageBucketService.save.mockResolvedValue(bucket);
      roomService.createRoom.mockResolvedValue({ id: 'room-1' } as any);
      conversationRepo.save.mockImplementation(async (c: any) => c);
      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockResolvedValue([] as any);

      await service.createConversation(
        'agent-1',
        ['agent-2'],
        RoomType.CONVERSATION_DIRECT
      );

      expect(
        storageAggregatorService.createStorageAggregator
      ).toHaveBeenCalledWith(
        StorageAggregatorType.CONVERSATION,
        platformAggregator
      );
      // The aggregator must be ON the entity handed to save(), not created and
      // dropped — that is what gives the conversation storage from the start.
      const saved = conversationRepo.save.mock.calls[0][0] as any;
      expect(saved.storageAggregator).toEqual(
        expect.objectContaining({ id: 'agg-1' })
      );
      // And the bucket policy is tightened to the conversation media set.
      expect(bucket.allowedMimeTypes).toBe(
        CONVERSATION_MEDIA_ALLOWED_MIME_TYPES
      );
      expect(bucket.maxFileSize).toBe(CONVERSATION_MEDIA_MAX_FILE_SIZE);
    });

    it('B2: does NOT destroy the storage when the conversation row is already committed', async () => {
      // Rollback is only legitimate while the conversation is UNCOMMITTED. Once
      // the row is durable (here the membership insert is what fails), deleting
      // its aggregator is destruction, not rollback: the FK is ON DELETE SET
      // NULL, so the committed conversation would be permanently left with no
      // storage and no repair path. Leave it repairable instead.
      storageAggregatorService.createStorageAggregator.mockResolvedValue({
        id: 'agg-1',
        directStorage: undefined,
      } as any);
      roomService.createRoom.mockResolvedValue({ id: 'room-1' } as any);
      conversationRepo.save.mockResolvedValue({
        id: 'conv-new',
      } as Conversation);
      membershipRepo.create.mockImplementation(data => data as any);
      membershipRepo.save.mockRejectedValue(
        new Error('membership insert failed')
      );

      await expect(
        service.createConversation(
          'agent-1',
          ['agent-2'],
          RoomType.CONVERSATION_DIRECT
        )
      ).rejects.toThrow('membership insert failed');

      expect(storageAggregatorService.delete).not.toHaveBeenCalled();
    });
  });

  describe('findConversationWithWellKnownVC', () => {
    it('should return null when well-known VC ID cannot be resolved', async () => {
      platformWellKnownVCService.getVirtualContributorID.mockResolvedValue(
        undefined as any
      );

      const result = await service.findConversationWithWellKnownVC(
        'user-1',
        'CHAT_GUIDANCE' as any
      );

      expect(result).toBeNull();
    });
  });
});
