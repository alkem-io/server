import { ActorType } from '@common/enums/actor.type';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
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

    // Realistic `reset`: the production one CLEARS the rules on the policy it is
    // handed and returns that same object. A mock that returned a fresh stub
    // would hide the whole point of A1 (that the rules persisted on the policy
    // must be cleared before the participant rule is re-appended).
    authorizationPolicyService.reset.mockImplementation((policy: any) => {
      policy.credentialRules = [];
      policy.privilegeRules = [];
      return policy;
    });
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

    // --- A1: stale participant grants must not accumulate ---

    describe('A1: membership changes rebuild the policy from a clean state', () => {
      /** The real createCredentialRule shape, so the rules are inspectable. */
      const useRealisticCredentialRule = () => {
        authorizationPolicyService.createCredentialRule.mockImplementation(
          (grantedPrivileges: any, criterias: any, name: any) =>
            ({ grantedPrivileges, criterias, cascade: true, name }) as any
        );
      };

      /** Actor ids granted READ by the policy, across every credential rule. */
      const grantedUserIDs = (authorization: any): string[] =>
        authorization.credentialRules.flatMap((rule: any) =>
          rule.criterias.map((criteria: any) => criteria.resourceID)
        );

      it('a removed member loses READ while remaining members keep it', async () => {
        useRealisticCredentialRule();
        // ONE persisted policy object, reused across both resets — this is what
        // makes the accumulation visible: `credentialRules` is a jsonb column
        // that round-trips, so an appended rule survives into the next reset.
        const persistedAuthorization = {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        };
        const conversation = {
          id: 'conv-1',
          authorization: persistedAuthorization,
          room: undefined,
        } as any;
        conversationService.getConversationOrFail.mockResolvedValue(
          conversation
        );
        userLookupService.getUserById.mockImplementation(
          async (id: string) => ({ id }) as any
        );

        // 1. Alice + Bob are members.
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'alice', actorType: ActorType.USER },
          { actorID: 'bob', actorType: ActorType.USER },
        ] as any);
        await service.applyAuthorizationPolicy('conv-1');
        expect(grantedUserIDs(persistedAuthorization).sort()).toEqual([
          'alice',
          'bob',
        ]);

        // 2. Bob leaves; the auth reset re-runs against the SAME persisted policy.
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'alice', actorType: ActorType.USER },
        ] as any);
        await service.applyAuthorizationPolicy('conv-1');

        // Bob's grant is GONE (it used to survive on the stale, never-cleared
        // rule) and Alice's access is fully re-granted.
        expect(grantedUserIDs(persistedAuthorization)).toEqual(['alice']);
        expect(persistedAuthorization.credentialRules).toHaveLength(1);
      });

      it('repeated resets with unchanged membership stay idempotent (one rule, not N)', async () => {
        useRealisticCredentialRule();
        const persistedAuthorization = {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        };
        conversationService.getConversationOrFail.mockResolvedValue({
          id: 'conv-1',
          authorization: persistedAuthorization,
          room: undefined,
        } as any);
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: 'alice', actorType: ActorType.USER },
        ] as any);
        userLookupService.getUserById.mockImplementation(
          async (id: string) => ({ id }) as any
        );

        await service.applyAuthorizationPolicy('conv-1');
        await service.applyAuthorizationPolicy('conv-1');
        await service.applyAuthorizationPolicy('conv-1');

        expect(persistedAuthorization.credentialRules).toHaveLength(1);
        expect(grantedUserIDs(persistedAuthorization)).toEqual(['alice']);
      });
    });
  });
});

// --- A2: the conversation→bucket→document cascade must tolerate a tagset-less
// document (every inbound, Element-origin re-homed attachment is one) ---

describe('ConversationAuthorizationService — cascade over inbound (tagset-less) attachments (A2)', () => {
  let service: ConversationAuthorizationService;
  let conversationService: Mocked<ConversationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // The REAL bucket + document authorization services, so the cascade this
    // test exercises is the production one end to end. Only the policy
    // persistence layer is mocked.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationAuthorizationService,
        StorageBucketAuthorizationService,
        DocumentAuthorizationService,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversationAuthorizationService);
    conversationService = module.get(ConversationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);

    authorizationPolicyService.reset.mockImplementation((policy: any) => {
      policy.credentialRules = [];
      policy.privilegeRules = [];
      return policy;
    });
    authorizationPolicyService.inheritParentAuthorization.mockImplementation(
      (child: any) => child ?? { id: 'created', credentialRules: [] }
    );
    authorizationPolicyService.createCredentialRule.mockImplementation(
      (grantedPrivileges: any, criterias: any, name: any) =>
        ({ grantedPrivileges, criterias, cascade: true, name }) as any
    );
    authorizationPolicyService.appendCredentialAuthorizationRules.mockImplementation(
      (authorization: any) => authorization
    );
    authorizationPolicyService.appendPrivilegeAuthorizationRules.mockImplementation(
      (authorization: any) => authorization
    );
    authorizationPolicyService.saveAll.mockResolvedValue(undefined as any);

    conversationService.getConversationMembers.mockResolvedValue([
      { actorID: 'alice', actorType: ActorType.USER },
    ] as any);
  });

  const conversationWithDocument = (document: any) => ({
    id: 'conv-1',
    authorization: { id: 'conv-auth', credentialRules: [], privilegeRules: [] },
    room: undefined,
    storageAggregator: {
      id: 'agg-1',
      authorization: { id: 'agg-auth', credentialRules: [] },
      directStorage: {
        id: 'bucket-1',
        authorization: { id: 'bucket-auth', credentialRules: [] },
        documents: [document],
      },
    },
  });

  it('a membership change on a conversation holding an INBOUND (tagset-less) attachment succeeds', async () => {
    // An Element-origin attachment: the Synapse media-storage provider creates
    // the staging row with NO tagsetId, and the re-home MOVE cannot add one
    // (PATCH /internal/file/:id has no tagsetId field, and the server never
    // writes the `file` table). DocumentAuthorizationService used to hard-throw
    // RelationshipNotFoundException on exactly this, aborting the whole
    // conversation auth reset on every join/leave.
    const inboundDocument = {
      id: 'doc-inbound',
      createdBy: 'alice',
      authorization: { id: 'doc-auth', credentialRules: [] },
      tagset: null,
    };
    conversationService.getConversationOrFail.mockResolvedValue(
      conversationWithDocument(inboundDocument) as any
    );

    await expect(
      service.applyAuthorizationPolicy('conv-1')
    ).resolves.toBeDefined();

    // The document's OWN policy was still applied and persisted — the tagset leg
    // is the only thing skipped.
    expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
      inboundDocument.authorization,
    ]);
  });

  it('still applies BOTH policies for a document that does have a tagset', async () => {
    const webDocument = {
      id: 'doc-web',
      createdBy: 'alice',
      authorization: { id: 'doc-auth', credentialRules: [] },
      tagset: {
        id: 'tagset-1',
        authorization: { id: 'tagset-auth', credentialRules: [] },
      },
    };
    conversationService.getConversationOrFail.mockResolvedValue(
      conversationWithDocument(webDocument) as any
    );

    await expect(
      service.applyAuthorizationPolicy('conv-1')
    ).resolves.toBeDefined();

    expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
      webDocument.authorization,
      webDocument.tagset.authorization,
    ]);
  });
});
