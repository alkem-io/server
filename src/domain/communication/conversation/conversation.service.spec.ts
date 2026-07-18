import { ActorType } from '@common/enums/actor.type';
import { RoomType } from '@common/enums/room.type';
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
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
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
  let storageBucketService: Mocked<StorageBucketService>;
  let conversationRepo: Mocked<Repository<Conversation>>;
  let membershipRepo: Mocked<Repository<ConversationMembership>>;
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
    storageBucketService = module.get(StorageBucketService);
    conversationRepo = module.get(getRepositoryToken(Conversation));
    membershipRepo = module.get(getRepositoryToken(ConversationMembership));

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
