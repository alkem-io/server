import { ActorType } from '@common/enums/actor.type';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
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
  let storageBucketAuthorizationService: Mocked<StorageBucketAuthorizationService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    storageBucketAuthorizationService = module.get(
      StorageBucketAuthorizationService
    );
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

    it('loads documents with their tagset and cascades to the bucket auth without RelationshipNotFoundException when a conversation has accrued attachment documents (FIX 0)', async () => {
      // A conversation that has accumulated attachment documents. The bucket auth
      // reset cascades into DocumentAuthorizationService, which dereferences
      // document.tagset (+ tagset.authorization) — so the loader MUST request
      // `documents: { tagset: true }` (mirroring the sibling
      // StorageAggregatorAuthorizationService), or the whole conversation auth
      // propagation aborts with RelationshipNotFoundException.
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const bucketAuth = { id: 'bucket-auth' };
      const directStorage = {
        id: 'bucket-1',
        authorization: bucketAuth,
        documents: [
          {
            id: 'doc-1',
            authorization: { id: 'doc-auth' },
            tagset: { id: 'tagset-1', authorization: { id: 'tagset-auth' } },
          },
        ],
      };
      const mockConversation = {
        id: 'conv-1',
        authorization: mockAuth,
        room: undefined,
        storageAggregator: {
          id: 'agg-1',
          authorization: { id: 'agg-auth' },
          directStorage,
        },
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([]);
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        cascade: false,
      } as any);
      authorizationPolicyService.reset.mockReturnValue({
        id: 'agg-auth-reset',
      } as any);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
        id: 'agg-auth-inherited',
      } as any);
      // The bucket auth service resets+inherits, cascades to documents (their
      // tagset), persists internally, and returns []. It is the collaborator that
      // would throw RelationshipNotFoundException on an unloaded tagset.
      storageBucketAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      await expect(
        service.applyAuthorizationPolicy('conv-1')
      ).resolves.toBeDefined();

      // The loader must request the tagset under documents (the exact relation
      // that makes tagset + tagset.authorization available downstream).
      expect(conversationService.getConversationOrFail).toHaveBeenCalledWith(
        'conv-1',
        {
          relations: {
            authorization: true,
            room: true,
            storageAggregator: {
              authorization: true,
              directStorage: {
                authorization: true,
                documents: { tagset: true },
              },
            },
          },
        }
      );
      // And the bucket auth reset is cascaded with the loaded directStorage
      // (documents-with-tagset), reaching DocumentAuthorizationService without a
      // RelationshipNotFoundException.
      expect(
        storageBucketAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(directStorage, { id: 'agg-auth-inherited' });
    });
  });
});
