import { ActorType } from '@common/enums/actor.type';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';

describe('ConversationAuthorizationService', () => {
  let service: ConversationAuthorizationService;
  let conversationService: Mocked<ConversationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let roomAuthorizationService: Mocked<RoomAuthorizationService>;
  let userLookupService: Mocked<UserLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversationAuthorizationService);
    conversationService = module.get(ConversationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
    userLookupService = module.get(UserLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization to conversation and room', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const mockRoomAuth = { id: 'room-auth' };
      const mockConversation = {
        id: 'conv-1',
        authorization: mockAuth,
        room: { id: 'room-1', authorization: { id: 'room-auth-orig' } },
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'agent-1', actorType: ActorType.USER },
      ] as any);
      userLookupService.getUserById.mockResolvedValue({
        id: 'user-1',
      } as any);
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      } as any);
      roomAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
        mockRoomAuth as any
      );
      roomAuthorizationService.allowContributorsToCreateMessages.mockReturnValue(
        mockRoomAuth as any
      );
      roomAuthorizationService.allowContributorsToReplyReactToMessages.mockReturnValue(
        mockRoomAuth as any
      );

      const result = await service.applyAuthorizationPolicy('conv-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockAuth);
      expect(result[1]).toBe(mockRoomAuth);
      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).toHaveBeenCalled();
      expect(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).toHaveBeenCalled();
    });

    it('should throw when authorization is not loaded', async () => {
      const mockConversation = {
        id: 'conv-1',
        authorization: undefined,
        room: { id: 'room-1' },
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );

      await expect(service.applyAuthorizationPolicy('conv-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should handle conversation without room', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const mockConversation = {
        id: 'conv-1',
        authorization: mockAuth,
        room: undefined,
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([]);
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      } as any);

      const result = await service.applyAuthorizationPolicy('conv-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockAuth);
      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should skip non-user members in authorization rules', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const mockConversation = {
        id: 'conv-1',
        authorization: mockAuth,
        room: undefined,
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'vc-agent-1', actorType: ActorType.VIRTUAL_CONTRIBUTOR },
      ] as any);
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      } as any);

      const result = await service.applyAuthorizationPolicy('conv-1');

      expect(result).toHaveLength(1);
      expect(userLookupService.getUserById).not.toHaveBeenCalled();
    });

    it('should skip user members that cannot be resolved', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const mockConversation = {
        id: 'conv-1',
        authorization: mockAuth,
        room: undefined,
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'agent-1', actorType: ActorType.USER },
      ] as any);
      userLookupService.getUserById.mockResolvedValue(null as any);
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      } as any);

      const result = await service.applyAuthorizationPolicy('conv-1');

      expect(result).toHaveLength(1);
    });
  });
});
