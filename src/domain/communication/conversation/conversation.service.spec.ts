import { AgentType } from '@common/enums/agent.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('ConversationService', () => {
  let service: ConversationService;
  let roomService: Mocked<RoomService>;
  let roomAuthorizationService: Mocked<RoomAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let userLookupService: Mocked<UserLookupService>;
  let virtualContributorLookupService: Mocked<VirtualContributorLookupService>;
  let platformWellKnownVCService: Mocked<PlatformWellKnownVirtualContributorsService>;
  let db: any;

  beforeEach(async () => {
    // Mock static Conversation.create to avoid DataSource requirement
    vi.spyOn(Conversation, 'create').mockImplementation((input: any) => {
      const entity = new Conversation();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        mockDrizzleProvider,
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
    virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    );
    platformWellKnownVCService = module.get(
      PlatformWellKnownVirtualContributorsService
    );
    db = module.get(DRIZZLE);
  });

  describe('getConversationOrFail', () => {
    it('should return conversation when found', async () => {
      const mockConversation = { id: 'conv-1' } as Conversation;
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.getConversationOrFail('conv-1');

      expect(result).toBe(mockConversation);
    });

    it('should throw EntityNotFoundException when conversation not found', async () => {

      await expect(service.getConversationOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
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
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.deleteConversation('conv-1');

      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockConversation.authorization
      );
      expect(result.id).toBe('conv-1');
    });

    it('should throw EntityNotInitializedException when room is missing', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
        authorization: { id: 'auth-1' },
        messaging: { id: 'messaging-1' },
      } as unknown as Conversation;
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

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
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

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
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

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
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.getRoom('conv-1');

      expect(result).toBe(mockRoom);
    });

    it('should return undefined when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as Conversation;
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

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
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.getCommentsCount('conv-1');

      expect(result).toBe(42);
    });

    it('should return 0 when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as Conversation;
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.getCommentsCount('conv-1');

      expect(result).toBe(0);
    });
  });

  describe('inferConversationType', () => {
    it('should return USER_USER when both members are users', async () => {
      const memberships: IConversationMembership[] = [
        {
          conversationId: 'conv-1',
          agentId: 'agent-1',
          agent: { id: 'agent-1', type: AgentType.USER },
        } as unknown as IConversationMembership,
        {
          conversationId: 'conv-1',
          agentId: 'agent-2',
          agent: { id: 'agent-2', type: AgentType.USER },
        } as unknown as IConversationMembership,
      ];

      const result = await service.inferConversationType(memberships);

      expect(result).toBe(CommunicationConversationType.USER_USER);
    });

    it('should return USER_VC when one member is a virtual contributor', async () => {
      const memberships: IConversationMembership[] = [
        {
          conversationId: 'conv-1',
          agentId: 'agent-1',
          agent: { id: 'agent-1', type: AgentType.USER },
        } as unknown as IConversationMembership,
        {
          conversationId: 'conv-1',
          agentId: 'agent-2',
          agent: {
            id: 'agent-2',
            type: AgentType.VIRTUAL_CONTRIBUTOR,
          },
        } as unknown as IConversationMembership,
      ];

      const result = await service.inferConversationType(memberships);

      expect(result).toBe(CommunicationConversationType.USER_VC);
    });

    it('should throw ValidationException when more than 2 members', async () => {
      const memberships: IConversationMembership[] = [
        {
          conversationId: 'conv-1',
          agentId: 'agent-1',
          agent: { id: 'agent-1', type: AgentType.USER },
        } as unknown as IConversationMembership,
        {
          conversationId: 'conv-1',
          agentId: 'agent-2',
          agent: { id: 'agent-2', type: AgentType.USER },
        } as unknown as IConversationMembership,
        {
          conversationId: 'conv-1',
          agentId: 'agent-3',
          agent: { id: 'agent-3', type: AgentType.USER },
        } as unknown as IConversationMembership,
      ];

      await expect(service.inferConversationType(memberships)).rejects.toThrow(
        ValidationException
      );
    });

    it('should return USER_USER for empty memberships array', async () => {
      const result = await service.inferConversationType([]);

      expect(result).toBe(CommunicationConversationType.USER_USER);
    });
  });

  describe('isConversationMember', () => {
    it('should return true when agent is a member', async () => {
      db.query.conversationMemberships.findFirst.mockResolvedValueOnce({ conversationId: 'conv-1', agentId: 'agent-1' });

      const result = await service.isConversationMember('conv-1', 'agent-1');

      expect(result).toBe(true);
    });

    it('should return false when agent is not a member', async () => {
      db.query.conversationMemberships.findFirst.mockResolvedValueOnce(undefined);

      const result = await service.isConversationMember('conv-1', 'agent-1');

      expect(result).toBe(false);
    });
  });

  describe('getVCFromConversation', () => {
    it('should return VC when conversation has a VC member', async () => {
      const mockVC = { id: 'vc-1', agent: { id: 'agent-vc' } } as any;
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-user', agent: { id: 'agent-user', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-vc', agent: { id: 'agent-vc', type: 'virtual-contributor' } },
      ]);
      virtualContributorLookupService.getVirtualContributorByAgentId.mockResolvedValue(
        mockVC
      );

      const result = await service.getVCFromConversation('conv-1');

      expect(result).toBe(mockVC);
      expect(
        virtualContributorLookupService.getVirtualContributorByAgentId
      ).toHaveBeenCalledWith('agent-vc', { with: { agent: true } });
    });

    it('should return null when conversation has no VC member', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-2', agent: { id: 'agent-2', type: 'user' } },
      ]);

      const result = await service.getVCFromConversation('conv-1');

      expect(result).toBeNull();
      expect(
        virtualContributorLookupService.getVirtualContributorByAgentId
      ).not.toHaveBeenCalled();
    });
  });

  describe('getUserFromConversation', () => {
    it('should return user when conversation has a user member', async () => {
      const mockUser = { id: 'user-1' } as any;
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
      ]);
      userLookupService.getUserByAgentId.mockResolvedValue(mockUser);

      const result = await service.getUserFromConversation('conv-1');

      expect(result).toBe(mockUser);
    });

    it('should exclude specified agent when excludeAgentId is provided', async () => {
      const mockUser2 = { id: 'user-2' } as any;
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-2', agent: { id: 'agent-2', type: 'user' } },
      ]);
      userLookupService.getUserByAgentId.mockResolvedValue(mockUser2);

      const result = await service.getUserFromConversation('conv-1', 'agent-1');

      expect(result).toBe(mockUser2);
      expect(userLookupService.getUserByAgentId).toHaveBeenCalledWith(
        'agent-2',
        { with: { agent: true } }
      );
    });

    it('should return null when no user member found after exclusion', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
      ]);

      const result = await service.getUserFromConversation('conv-1', 'agent-1');

      expect(result).toBeNull();
    });
  });

  describe('getConversationParticipants', () => {
    it('should group members by type into users and virtualContributors', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockVC = { id: 'vc-1' } as any;
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-2', agent: { id: 'agent-2', type: 'virtual-contributor' } },
      ]);

      userLookupService.getUserByAgentId.mockResolvedValue(mockUser);
      virtualContributorLookupService.getVirtualContributorByAgentId.mockResolvedValue(
        mockVC
      );

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toEqual([mockUser]);
      expect(result.virtualContributors).toEqual([mockVC]);
    });

    it('should handle conversations with only users', async () => {
      const mockUser1 = { id: 'user-1' } as any;
      const mockUser2 = { id: 'user-2' } as any;
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-2', agent: { id: 'agent-2', type: 'user' } },
      ]);

      userLookupService.getUserByAgentId
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toHaveLength(2);
      expect(result.virtualContributors).toHaveLength(0);
    });

    it('should skip members that cannot be resolved', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
      ]);

      userLookupService.getUserByAgentId.mockResolvedValue(null as any);

      const result = await service.getConversationParticipants('conv-1');

      expect(result.users).toHaveLength(0);
    });
  });

  describe('resetConversation', () => {
    it('should delete existing room and create a new one', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: { id: 'room-old' },
      } as unknown as IConversation;

      const newRoom = { id: 'room-new' } as any;
      roomService.createRoom.mockResolvedValue(newRoom);

      const _result = await service.resetConversation(
        mockConversation,
        'sender-agent',
        'receiver-agent'
      );

      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-old',
      });
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'conversation-sender-agent-receiver-agent',
        type: RoomType.CONVERSATION_DIRECT,
        senderActorId: 'sender-agent',
        receiverActorId: 'receiver-agent',
      });
    });

    it('should skip delete when conversation has no room', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
      } as unknown as IConversation;

      const newRoom = { id: 'room-new' } as any;
      roomService.createRoom.mockResolvedValue(newRoom);

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
      // getConversationOrFail for authorization
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);
      // getConversationMembers returns 1 member (not 2)
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
      ]);

      const result = await service.ensureRoomExists(mockConversation);

      expect(result).toBeUndefined();
    });

    it('should create room and apply authorization when conversation has 2 members', async () => {
      const mockConversation = {
        id: 'conv-1',
        room: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as IConversation;
      // getConversationOrFail for authorization
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);
      // getConversationMembers returns 2 members
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-1', agentId: 'agent-1', agent: { id: 'agent-1', type: 'user' } },
        { conversationId: 'conv-1', agentId: 'agent-2', agent: { id: 'agent-2', type: 'user' } },
      ]);

      const authPolicy = { id: 'auth-1' };

      const createdRoom = { id: 'room-new' } as any;
      roomService.createRoom.mockResolvedValue(createdRoom);

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

  describe('getConversationMemberAgentIds', () => {
    it('should return array of agent IDs from memberships', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { agentId: 'agent-1' },
        { agentId: 'agent-2' },
      ]);

      const result = await service.getConversationMemberAgentIds('conv-1');

      expect(result).toEqual(['agent-1', 'agent-2']);
    });

    it('should return empty array when no memberships exist', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([]);

      const result = await service.getConversationMemberAgentIds('conv-1');

      expect(result).toEqual([]);
    });
  });

  describe('createConversation', () => {
    it('should return existing conversation when one exists between agents', async () => {
      const existingConversation = { id: 'conv-existing' } as IConversation;

      // findConversationBetweenAgents: first query finds memberships for agent-1
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([
        { conversationId: 'conv-existing' },
      ]);
      // findConversationBetweenAgents: second query finds membership for agent-2 in same conversation
      db.query.conversationMemberships.findFirst.mockResolvedValueOnce({
        conversationId: 'conv-existing',
        agentId: 'agent-2',
        conversation: existingConversation,
      });

      const result = await service.createConversation(
        'agent-1',
        'agent-2',
        true
      );

      expect(result).toBe(existingConversation);
    });

    it('should create new conversation with room when createRoom is true', async () => {
      // findConversationBetweenAgents returns null (no existing memberships)
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([]);

      const savedConversation = { id: 'conv-new' } as Conversation;
      // save() inserts and returns
      db.returning.mockResolvedValueOnce([savedConversation]);

      const mockRoom = { id: 'room-1' } as any;
      roomService.createRoom.mockResolvedValue(mockRoom);

      const result = await service.createConversation(
        'agent-1',
        'agent-2',
        true
      );

      expect(result).toBe(savedConversation);
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: 'conversation-agent-1-agent-2',
        type: RoomType.CONVERSATION_DIRECT,
        senderActorId: 'agent-1',
        receiverActorId: 'agent-2',
      });
    });

    it('should create new conversation without room when createRoom is false', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([]);

      const savedConversation = { id: 'conv-new' } as Conversation;
      db.returning.mockResolvedValueOnce([savedConversation]);

      await service.createConversation('agent-1', 'agent-2', false);

      expect(roomService.createRoom).not.toHaveBeenCalled();
    });

    it('should create membership records for both agents', async () => {
      db.query.conversationMemberships.findMany.mockResolvedValueOnce([]);

      const savedConversation = { id: 'conv-new' } as Conversation;
      db.returning.mockResolvedValueOnce([savedConversation]);

      await service.createConversation('agent-1', 'agent-2', false);

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
