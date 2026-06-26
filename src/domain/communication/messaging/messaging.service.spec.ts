import { ActorType, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { EntityManager, Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { IConversation } from '../conversation/conversation.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { Messaging } from './messaging.entity';
import { IMessaging } from './messaging.interface';
import { MessagingService } from './messaging.service';
import { MessagingRejectionReason } from './types/messaging.rejection.reasons';

describe('MessagingService', () => {
  let service: MessagingService;
  let conversationService: Mocked<ConversationService>;
  let conversationAuthorizationService: Mocked<ConversationAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let subscriptionPublishService: Mocked<SubscriptionPublishService>;
  let userLookupService: Mocked<UserLookupService>;
  let actorLookupService: Mocked<ActorLookupService>;
  let roomLookupService: Mocked<RoomLookupService>;
  let messagingRepo: Mocked<Repository<Messaging>>;
  let conversationMembershipRepo: Mocked<Repository<ConversationMembership>>;
  let entityManager: Mocked<EntityManager>;
  let configService: { get: ReturnType<typeof vi.fn> };
  // Captures the `manager.query(...)` calls made inside the DIRECT dedup
  // transaction so tests can assert the advisory lock is actually acquired.
  let advisoryLockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    advisoryLockQuery = vi.fn().mockResolvedValue(undefined);

    configService = {
      get: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        repositoryProviderMockFactory(Messaging),
        repositoryProviderMockFactory(ConversationMembership),
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return configService;
        }
        if (token === EntityManager) {
          return {
            getRepository: vi.fn().mockReturnValue({
              createQueryBuilder: vi.fn().mockReturnValue({
                leftJoinAndSelect: vi.fn().mockReturnThis(),
                getOne: vi.fn(),
              }),
            }),
            find: vi.fn().mockResolvedValue([]),
            // The DIRECT dedup-or-create path now runs inside a transaction
            // that acquires a PostgreSQL advisory lock (FR-002 race guard).
            // Invoke the callback with a manager exposing the captured `query`
            // (so tests can assert the advisory lock is taken) and a
            // `getRepository` passthrough for the manager-scoped dedup probe.
            transaction: vi.fn(async (cb: any) =>
              cb({
                query: advisoryLockQuery,
                getRepository: vi.fn(),
              })
            ),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(MessagingService);
    conversationService = module.get(ConversationService);
    conversationAuthorizationService = module.get(
      ConversationAuthorizationService
    );
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    subscriptionPublishService = module.get(SubscriptionPublishService);
    userLookupService = module.get(UserLookupService);
    actorLookupService = module.get(ActorLookupService);
    roomLookupService = module.get(RoomLookupService);
    messagingRepo = module.get(getRepositoryToken(Messaging));
    conversationMembershipRepo = module.get(
      getRepositoryToken(ConversationMembership)
    );
    entityManager = module.get(EntityManager);
  });

  describe('deleteMessaging', () => {
    it('should throw EntityNotInitializedException when conversations are not loaded', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Messaging;

      // Mock Messaging.findOne (static method)
      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      await expect(service.deleteMessaging('messaging-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotInitializedException when authorization is not loaded', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: [],
        authorization: undefined,
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      await expect(service.deleteMessaging('messaging-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should delete authorization and all conversations then remove messaging', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: [{ id: 'conv-1' }, { id: 'conv-2' }],
        authorization: { id: 'auth-1' },
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);
      messagingRepo.remove.mockResolvedValue(mockMessaging);

      await service.deleteMessaging('messaging-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockMessaging.authorization
      );
      expect(conversationService.deleteConversation).toHaveBeenCalledWith(
        'conv-1'
      );
      expect(conversationService.deleteConversation).toHaveBeenCalledWith(
        'conv-2'
      );
      expect(messagingRepo.remove).toHaveBeenCalledWith(mockMessaging);
    });

    it('should handle messaging with no conversations', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: [],
        authorization: { id: 'auth-1' },
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);
      messagingRepo.remove.mockResolvedValue(mockMessaging);

      await service.deleteMessaging('messaging-1');

      expect(conversationService.deleteConversation).not.toHaveBeenCalled();
      expect(messagingRepo.remove).toHaveBeenCalled();
    });
  });

  describe('getMessagingOrFail', () => {
    it('should return messaging when found', async () => {
      const mockMessaging = { id: 'messaging-1' } as Messaging;
      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      const result = await service.getMessagingOrFail('messaging-1');

      expect(result).toBe(mockMessaging);
    });

    it('should throw EntityNotFoundException when messaging not found', async () => {
      vi.spyOn(Messaging, 'findOne').mockResolvedValue(null);

      await expect(service.getMessagingOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getConversations', () => {
    it('should return conversations from messaging', async () => {
      const mockConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
      ] as IConversation[];
      const mockMessaging = {
        id: 'messaging-1',
        conversations: mockConversations,
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      const result = await service.getConversations('messaging-1');

      expect(result).toBe(mockConversations);
      expect(result).toHaveLength(2);
    });
  });

  describe('getConversationsCount', () => {
    it('should return the count of conversations', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: [{ id: 'conv-1' }, { id: 'conv-2' }, { id: 'conv-3' }],
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      const result = await service.getConversationsCount('messaging-1');

      expect(result).toBe(3);
    });

    it('should return 0 when no conversations exist', async () => {
      const mockMessaging = {
        id: 'messaging-1',
        conversations: [],
      } as unknown as Messaging;

      vi.spyOn(Messaging, 'findOne').mockResolvedValue(mockMessaging);

      const result = await service.getConversationsCount('messaging-1');

      expect(result).toBe(0);
    });
  });

  describe('createConversation', () => {
    it('should throw ValidationException for DIRECT with wrong member count', async () => {
      await expect(
        service.createConversation({
          type: 'direct' as any,
          callerActorId: 'agent-1',
          memberActorIds: ['agent-2', 'agent-3'],
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should return existing conversation for DIRECT dedup', async () => {
      const existingConversation = {
        id: 'conv-1',
      } as unknown as IConversation;
      conversationService.findConversationBetweenActors.mockResolvedValue(
        existingConversation
      );
      conversationService.getConversationOrFail.mockResolvedValue(
        existingConversation
      );

      const result = await service.createConversation({
        type: 'direct' as any,
        callerActorId: 'agent-caller',
        memberActorIds: ['agent-invited'],
      });

      expect(
        conversationService.findConversationBetweenActors
      ).toHaveBeenCalledWith(
        'agent-caller',
        'agent-invited',
        expect.objectContaining({ query: advisoryLockQuery })
      );
      expect(result).toBe(existingConversation);
      expect(conversationService.createConversation).not.toHaveBeenCalled();
    });

    it('acquires the per-pair advisory lock (ordered key) before probing for an existing DIRECT conversation (FR-002 race guard)', async () => {
      const existingConversation = { id: 'conv-1' } as unknown as IConversation;
      conversationService.findConversationBetweenActors.mockResolvedValue(
        existingConversation
      );
      conversationService.getConversationOrFail.mockResolvedValue(
        existingConversation
      );

      // Initiator is the lexicographically-greater id to prove the key is
      // sorted (so {A,B} and {B,A} serialise on the SAME lock).
      await service.createConversation({
        type: 'direct' as any,
        callerActorId: 'b-actor',
        memberActorIds: ['a-actor'],
      });

      expect(advisoryLockQuery).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['a-actor:b-actor']
      );
      // Lock is acquired before the dedup probe runs...
      expect(advisoryLockQuery.mock.invocationCallOrder[0]).toBeLessThan(
        conversationService.findConversationBetweenActors.mock
          .invocationCallOrder[0]
      );
      // ...and the probe runs on the lock-scoped transaction manager.
      expect(
        conversationService.findConversationBetweenActors
      ).toHaveBeenCalledWith(
        'b-actor',
        'a-actor',
        expect.objectContaining({ query: advisoryLockQuery })
      );
    });
  });

  describe('sendDirectMessageToUsers (fan-out)', () => {
    const sender = 'sender-actor';
    const consenting = 'recipient-yes';
    const denying = 'recipient-no';

    const stubPlatformMessagingForCreate = () => {
      entityManager.getRepository.mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue({
          leftJoinAndSelect: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue({
            messaging: { id: 'platform-messaging' } as IMessaging,
          }),
        }),
      } as any);
    };

    // evaluateMemberConsent loads each recipient via getUsersByIds; return the
    // matching settings actor (or none → treated as denying).
    const stubConsent = (consentById: Record<string, boolean>) => {
      userLookupService.getUsersByIds.mockImplementation(
        async (ids: string[]) =>
          ids
            .filter(id => id in consentById)
            .map(
              id =>
                ({
                  id,
                  settings: {
                    communication: {
                      allowOtherUsersToSendMessages: consentById[id],
                    },
                  },
                }) as any
            )
      );
    };

    const stubCreatedConversation = (id: string, roomId: string) => {
      const conversation = {
        id,
        room: { id: roomId },
      } as unknown as IConversation;
      conversationService.findConversationBetweenActors.mockResolvedValue(null);
      conversationService.createConversation.mockResolvedValue(conversation);
      conversationService.save.mockResolvedValue(conversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(conversation);
      return conversation;
    };

    it('mixed batch: consenting → SENT (+ conversationID), chat-disabled → BLOCKED_NO_CONSENT; only the consenting recipient is messaged (FR-013, SC-005)', async () => {
      stubPlatformMessagingForCreate();
      stubConsent({ [consenting]: true, [denying]: false });
      stubCreatedConversation('conv-1', 'room-1');

      const results = await service.sendDirectMessageToUsers(
        sender,
        [consenting, denying],
        'hello'
      );

      expect(results).toEqual([
        {
          receiverID: consenting,
          status: 'SENT',
          conversationID: 'conv-1',
        },
        { receiverID: denying, status: 'BLOCKED_NO_CONSENT' },
      ]);
      // No conversation created for the blocked recipient; message sent once.
      expect(conversationService.createConversation).toHaveBeenCalledTimes(1);
      expect(roomLookupService.sendMessage).toHaveBeenCalledTimes(1);
      expect(roomLookupService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'room-1' }),
        sender,
        { roomID: 'room-1', message: 'hello' }
      );
    });

    it('excludes self and de-dups recipient ids (FR-012)', async () => {
      stubPlatformMessagingForCreate();
      stubConsent({ [consenting]: true });
      stubCreatedConversation('conv-1', 'room-1');

      const results = await service.sendDirectMessageToUsers(
        sender,
        [sender, consenting, consenting],
        'hi'
      );

      expect(results).toEqual([
        { receiverID: consenting, status: 'SENT', conversationID: 'conv-1' },
      ]);
    });

    it('one failing recipient → FAILED, others still delivered (no blanket failure)', async () => {
      stubPlatformMessagingForCreate();
      stubConsent({ [consenting]: true, 'recipient-boom': true });
      const ok = {
        id: 'conv-ok',
        room: { id: 'room-ok' },
      } as unknown as IConversation;
      conversationService.findConversationBetweenActors.mockResolvedValue(null);
      conversationService.save.mockResolvedValue(ok);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(ok);
      // First recipient creates fine; second throws inside create.
      conversationService.createConversation
        .mockResolvedValueOnce(ok)
        .mockRejectedValueOnce(new Error('boom'));

      const results = await service.sendDirectMessageToUsers(
        sender,
        [consenting, 'recipient-boom'],
        'msg'
      );

      expect(results).toEqual([
        { receiverID: consenting, status: 'SENT', conversationID: 'conv-ok' },
        { receiverID: 'recipient-boom', status: 'FAILED' },
      ]);
    });
  });

  describe('createConversationFromExternal', () => {
    const creatorId = '11111111-1111-4111-8111-111111111111';
    const memberId = '22222222-2222-4222-8222-222222222222';
    const vcMemberId = '99999999-9999-4999-8999-999999999999';

    const stubPlatformMessaging = () => {
      const mockPlatformRepo = {
        createQueryBuilder: vi.fn().mockReturnValue({
          leftJoinAndSelect: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue({
            messaging: { id: 'platform-messaging' } as IMessaging,
          }),
        }),
      };
      entityManager.getRepository.mockReturnValue(mockPlatformRepo as any);
    };

    // Stub actor-type resolution for the given map of id → ActorType.
    // The default fallback for everything else is USER.
    const stubActorTypes = (override: Record<string, ActorType> = {}) => {
      actorLookupService.validateActorsAndGetTypes.mockImplementation(
        async (ids: string[]) =>
          new Map(ids.map(id => [id, override[id] ?? ActorType.USER]))
      );
    };

    const consentingUserActor = (id: string) =>
      ({
        id,
        settings: {
          communication: { allowOtherUsersToSendMessages: true },
        },
      }) as any;

    const denyingUserActor = (id: string) =>
      ({
        id,
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      }) as any;

    // T016 — covers data-model.md test matrix row 1
    it('DM happy path: creates Conversation+Room with assigned UUID, fires subscription once', async () => {
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        consentingUserActor(memberId),
      ]);
      conversationService.findConversationBetweenActors.mockResolvedValue(null);

      const createdConversation = {
        id: 'conv-1',
        room: { id: 'unused-by-mock' },
      } as unknown as IConversation;
      conversationService.createConversation.mockResolvedValue(
        createdConversation
      );
      conversationService.save.mockResolvedValue(createdConversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(
        createdConversation
      );

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId],
        isDirect: true,
      });

      expect(result.kind).toBe('accepted');
      if (result.kind !== 'accepted') return; // narrow for TS
      expect(result.alkemioRoomId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      // ConversationService.createConversation called with the assigned UUID
      // (6th arg) and CONVERSATION_DIRECT.
      expect(conversationService.createConversation).toHaveBeenCalledTimes(1);
      const callArgs = conversationService.createConversation.mock.calls[0];
      expect(callArgs[0]).toBe(creatorId); // creatorActorId
      expect(callArgs[1]).toEqual([memberId]); // consentingIds
      expect(callArgs[2]).toBe('conversation_direct'); // RoomType.CONVERSATION_DIRECT
      expect(callArgs[5]).toBe(result.alkemioRoomId); // externalRoomId

      // Subscription publish fires exactly once with both members in the fan-out.
      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledTimes(1);
      const publishedEvent =
        subscriptionPublishService.publishConversationEvent.mock.calls[0][0];
      expect(publishedEvent.memberActorIds).toEqual(
        expect.arrayContaining([creatorId, memberId])
      );
      expect(publishedEvent.memberActorIds).toHaveLength(2);
    });

    // T020 — covers data-model.md test matrix row 2
    it('DM consent denied: rejects with MESSAGING_DISABLED and creates no Conversation', async () => {
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        denyingUserActor(memberId),
      ]);
      conversationService.findConversationBetweenActors.mockResolvedValue(null);

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId],
        isDirect: true,
      });

      expect(result).toEqual({
        kind: 'rejected',
        reason: MessagingRejectionReason.MESSAGING_DISABLED,
      });

      expect(conversationService.createConversation).not.toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });

    // T017 — covers data-model.md test matrix row 4
    it('group happy path: all consenting → CONVERSATION_GROUP with N members + fan-out covers all', async () => {
      const memberB = '33333333-3333-4333-8333-333333333333';
      const memberC = '44444444-4444-4444-8444-444444444444';
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        consentingUserActor(memberId),
        consentingUserActor(memberB),
        consentingUserActor(memberC),
      ]);

      const createdConversation = {
        id: 'conv-group-1',
        room: { id: 'unused-by-mock' },
      } as unknown as IConversation;
      conversationService.createConversation.mockResolvedValue(
        createdConversation
      );
      conversationService.save.mockResolvedValue(createdConversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(
        createdConversation
      );

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId, memberB, memberC],
        isDirect: false,
      });

      expect(result.kind).toBe('accepted');

      const callArgs = conversationService.createConversation.mock.calls[0];
      expect(callArgs[1]).toEqual([memberId, memberB, memberC]);
      expect(callArgs[2]).toBe('conversation_group');

      const publishedEvent =
        subscriptionPublishService.publishConversationEvent.mock.calls[0][0];
      expect(publishedEvent.memberActorIds).toHaveLength(4);
      expect(publishedEvent.memberActorIds).toEqual(
        expect.arrayContaining([creatorId, memberId, memberB, memberC])
      );
    });

    // T018 — covers data-model.md test matrix row 7
    it('group with same membership as existing group is NOT deduplicated', async () => {
      const memberB = '33333333-3333-4333-8333-333333333333';
      const memberC = '44444444-4444-4444-8444-444444444444';
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        consentingUserActor(memberId),
        consentingUserActor(memberB),
        consentingUserActor(memberC),
      ]);

      const createdConversation = {
        id: 'conv-group-new',
        room: { id: 'unused-by-mock' },
      } as unknown as IConversation;
      conversationService.createConversation.mockResolvedValue(
        createdConversation
      );
      conversationService.save.mockResolvedValue(createdConversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(
        createdConversation
      );

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId, memberB, memberC],
        isDirect: false,
      });

      // Group flow never probes findConversationBetweenActors — that probe is
      // DM-only by design.
      expect(
        conversationService.findConversationBetweenActors
      ).not.toHaveBeenCalled();
      expect(result.kind).toBe('accepted');
      expect(conversationService.createConversation).toHaveBeenCalledTimes(1);
    });

    // T019 — covers data-model.md test matrix row 6
    it('group partial consent: only consenting members registered + fan-out excludes deniers', async () => {
      const memberB = '33333333-3333-4333-8333-333333333333';
      const memberC = '44444444-4444-4444-8444-444444444444';
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        consentingUserActor(memberId),
        denyingUserActor(memberB),
        consentingUserActor(memberC),
      ]);

      const createdConversation = {
        id: 'conv-group-partial',
        room: { id: 'unused-by-mock' },
      } as unknown as IConversation;
      conversationService.createConversation.mockResolvedValue(
        createdConversation
      );
      conversationService.save.mockResolvedValue(createdConversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      conversationService.getConversationOrFail.mockResolvedValue(
        createdConversation
      );

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId, memberB, memberC],
        isDirect: false,
      });

      expect(result.kind).toBe('accepted');

      const callArgs = conversationService.createConversation.mock.calls[0];
      // Denying memberB filtered out; consenting memberId + memberC remain.
      expect(callArgs[1]).toEqual([memberId, memberC]);

      const publishedEvent =
        subscriptionPublishService.publishConversationEvent.mock.calls[0][0];
      expect(publishedEvent.memberActorIds).toEqual(
        expect.arrayContaining([creatorId, memberId, memberC])
      );
      expect(publishedEvent.memberActorIds).not.toContain(memberB);
      expect(publishedEvent.memberActorIds).toHaveLength(3);
    });

    // T021 — covers data-model.md test matrix row 3
    it('DM duplicate: existing conversation between actors → reject DUPLICATE_DIRECT_CONVERSATION', async () => {
      stubPlatformMessaging();
      stubActorTypes();
      conversationService.findConversationBetweenActors.mockResolvedValue({
        id: 'pre-existing-conv',
      } as unknown as IConversation);

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId],
        isDirect: true,
      });

      expect(result).toEqual({
        kind: 'rejected',
        reason: MessagingRejectionReason.DUPLICATE_DIRECT_CONVERSATION,
      });
      expect(conversationService.createConversation).not.toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
      // dedup short-circuits BEFORE the consent helper runs — so the
      // user-table lookup that the consent helper performs is never invoked.
      expect(userLookupService.getUsersByIds).not.toHaveBeenCalled();
    });

    // T022 — covers data-model.md test matrix row 5
    it('group all denied: zero consenters → reject NO_RECIPIENTS_ALLOW_MESSAGING', async () => {
      const memberB = '33333333-3333-4333-8333-333333333333';
      const memberC = '44444444-4444-4444-8444-444444444444';
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        denyingUserActor(memberId),
        denyingUserActor(memberB),
        denyingUserActor(memberC),
      ]);

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId, memberB, memberC],
        isDirect: false,
      });

      expect(result).toEqual({
        kind: 'rejected',
        reason: MessagingRejectionReason.NO_RECIPIENTS_ALLOW_MESSAGING,
      });
      expect(conversationService.createConversation).not.toHaveBeenCalled();
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });

    // T023 — covers data-model.md test matrix rows 10–13
    describe('malformed payloads → MALFORMED_REQUEST', () => {
      const malformedExpect = (result: { kind: string; reason?: string }) => {
        expect(result).toEqual({
          kind: 'rejected',
          reason: MessagingRejectionReason.MALFORMED_REQUEST,
        });
      };

      it('DM with 2 members rejects', async () => {
        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [memberId, '33333333-3333-4333-8333-333333333333'],
          isDirect: true,
        });
        malformedExpect(result);
        expect(
          actorLookupService.validateActorsAndGetTypes
        ).not.toHaveBeenCalled();
      });

      it('group with 0 members rejects', async () => {
        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [],
          isDirect: false,
        });
        malformedExpect(result);
        expect(
          actorLookupService.validateActorsAndGetTypes
        ).not.toHaveBeenCalled();
      });

      it('creator id duplicated in members rejects', async () => {
        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [creatorId, memberId],
          isDirect: false,
        });
        malformedExpect(result);
        expect(
          actorLookupService.validateActorsAndGetTypes
        ).not.toHaveBeenCalled();
      });

      it('non-UUID actor id rejects', async () => {
        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: ['not-a-uuid'],
          isDirect: true,
        });
        malformedExpect(result);
        expect(
          actorLookupService.validateActorsAndGetTypes
        ).not.toHaveBeenCalled();
      });
    });

    // T024 — covers data-model.md test matrix rows 8–9
    describe('unknown actor → ACTOR_NOT_FOUND', () => {
      it('unknown creator id rejects', async () => {
        actorLookupService.validateActorsAndGetTypes.mockRejectedValue(
          new EntityNotFoundException('Actor not found', LogContext.COMMUNITY)
        );

        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [memberId],
          isDirect: true,
        });

        expect(result).toEqual({
          kind: 'rejected',
          reason: MessagingRejectionReason.ACTOR_NOT_FOUND,
        });
        expect(conversationService.createConversation).not.toHaveBeenCalled();
      });

      it('unknown member id (one of several) rejects', async () => {
        const memberB = '33333333-3333-4333-8333-333333333333';
        actorLookupService.validateActorsAndGetTypes.mockRejectedValue(
          new EntityNotFoundException(
            'One or more actors not found',
            LogContext.COMMUNITY
          )
        );

        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [memberId, memberB],
          isDirect: false,
        });

        expect(result).toEqual({
          kind: 'rejected',
          reason: MessagingRejectionReason.ACTOR_NOT_FOUND,
        });
        expect(conversationService.createConversation).not.toHaveBeenCalled();
      });
    });

    // Mixed actor type scenarios — covers the "Matrix user maps to any Actor"
    // generalization. The consent gate applies ONLY to USER-type actors;
    // VirtualContributor / Organization / Space / Account members are exempt.
    describe('mixed actor types — non-User actors bypass consent', () => {
      it('DM with VC target: no consent evaluation, VC always registered', async () => {
        stubPlatformMessaging();
        stubActorTypes({ [vcMemberId]: ActorType.VIRTUAL_CONTRIBUTOR });
        conversationService.findConversationBetweenActors.mockResolvedValue(
          null
        );

        const createdConversation = {
          id: 'conv-vc',
          room: { id: 'unused-by-mock' },
        } as unknown as IConversation;
        conversationService.createConversation.mockResolvedValue(
          createdConversation
        );
        conversationService.save.mockResolvedValue(createdConversation);
        conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
          []
        );
        authorizationPolicyService.saveAll.mockResolvedValue(undefined);
        conversationService.getConversationOrFail.mockResolvedValue(
          createdConversation
        );

        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [vcMemberId],
          isDirect: true,
        });

        expect(result.kind).toBe('accepted');
        expect(conversationService.createConversation).toHaveBeenCalledTimes(1);
        // VC has no settings.communication.allowOtherUsersToSendMessages —
        // the user-table lookup the consent helper performs must be skipped
        // entirely when no consent-evaluable members remain.
        expect(userLookupService.getUsersByIds).not.toHaveBeenCalled();
        const callArgs = conversationService.createConversation.mock.calls[0];
        expect(callArgs[1]).toEqual([vcMemberId]);
      });

      it('group with mix of denying USER + consenting VC: VC alone keeps the room alive', async () => {
        stubPlatformMessaging();
        stubActorTypes({ [vcMemberId]: ActorType.VIRTUAL_CONTRIBUTOR });
        userLookupService.getUsersByIds.mockResolvedValue([
          denyingUserActor(memberId),
        ]);

        const createdConversation = {
          id: 'conv-mixed',
          room: { id: 'unused-by-mock' },
        } as unknown as IConversation;
        conversationService.createConversation.mockResolvedValue(
          createdConversation
        );
        conversationService.save.mockResolvedValue(createdConversation);
        conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
          []
        );
        authorizationPolicyService.saveAll.mockResolvedValue(undefined);
        conversationService.getConversationOrFail.mockResolvedValue(
          createdConversation
        );

        const result = await service.createConversationFromExternal({
          creatorActorId: creatorId,
          memberActorIds: [memberId, vcMemberId],
          isDirect: false,
        });

        expect(result.kind).toBe('accepted');
        const callArgs = conversationService.createConversation.mock.calls[0];
        // memberId is a USER who denies → filtered out. vcMemberId is exempt
        // → stays. Final registered membership is just the VC.
        expect(callArgs[1]).toEqual([vcMemberId]);
      });
    });

    // T027 — covers data-model.md test matrix rows 15–16
    describe('getRoomInfo', () => {
      const roomId = '55555555-5555-4555-8555-555555555555';

      // getRoomInfo loads members via entityManager.find(Actor, ...) so the
      // resolver works for any actor type, not just Users.
      const stubActorsFind = (actors: any[]) => {
        entityManager.find.mockImplementation(async (entity: any) =>
          entity === Actor ? actors : []
        );
      };

      it('hit on a direct conversation: returns conversation_direct + helper-resolved displayNames', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-direct',
          room: { id: roomId, type: 'conversation_direct' },
        } as any);
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: creatorId } as any,
          { actorID: memberId } as any,
        ]);
        stubActorsFind([
          {
            id: creatorId,
            profile: { displayName: 'Creator Name' },
            nameID: 'creator-nameid',
          },
          {
            id: memberId,
            profile: { displayName: '   ' }, // whitespace → falls back to nameID
            nameID: 'member-nameid',
          },
        ]);

        const result = await service.getRoomInfo(roomId);

        expect(result.type).toBe('conversation_direct');
        expect(result.isDirect).toBe(true);
        expect(result.members).toEqual([
          { actorId: creatorId, displayName: 'Creator Name' },
          { actorId: memberId, displayName: 'member-nameid' },
        ]);
      });

      it('hit on a group conversation: returns conversation_group + isDirect=false', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-group',
          room: { id: roomId, type: 'conversation_group' },
        } as any);
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: creatorId } as any,
        ]);
        stubActorsFind([
          {
            id: creatorId,
            profile: { displayName: 'Solo' },
            nameID: 'solo-nameid',
          },
        ]);

        const result = await service.getRoomInfo(roomId);

        expect(result.type).toBe('conversation_group');
        expect(result.isDirect).toBe(false);
        expect(result.members).toEqual([
          { actorId: creatorId, displayName: 'Solo' },
        ]);
      });

      it('hit with mixed-type members: resolves any Actor (User + VC), not just Users', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue({
          id: 'conv-mixed',
          room: { id: roomId, type: 'conversation_group' },
        } as any);
        conversationService.getConversationMembers.mockResolvedValue([
          { actorID: creatorId } as any,
          { actorID: vcMemberId } as any,
        ]);
        stubActorsFind([
          {
            id: creatorId,
            profile: { displayName: 'Anton' },
            nameID: 'anton-nameid',
          },
          {
            id: vcMemberId,
            profile: { displayName: 'Guidance VC' },
            nameID: 'guidance',
          },
        ]);

        const result = await service.getRoomInfo(roomId);

        expect(result.members).toEqual([
          { actorId: creatorId, displayName: 'Anton' },
          { actorId: vcMemberId, displayName: 'Guidance VC' },
        ]);
      });

      it('miss on a non-existent room id: empty-members envelope', async () => {
        conversationService.findConversationByRoomId.mockResolvedValue(null);

        const result = await service.getRoomInfo(roomId);

        expect(result).toEqual({ type: '', isDirect: false, members: [] });
        expect(
          conversationService.getConversationMembers
        ).not.toHaveBeenCalled();
      });

      it('non-UUID input short-circuits to miss envelope (no DB hit)', async () => {
        const result = await service.getRoomInfo('not-a-uuid');

        expect(result).toEqual({ type: '', isDirect: false, members: [] });
        expect(
          conversationService.findConversationByRoomId
        ).not.toHaveBeenCalled();
      });
    });

    // T025 — covers data-model.md test matrix row 14
    it('transient persistence failure → INTERNAL_ERROR; outer try/catch caught', async () => {
      stubPlatformMessaging();
      stubActorTypes();
      userLookupService.getUsersByIds.mockResolvedValue([
        consentingUserActor(memberId),
      ]);
      conversationService.findConversationBetweenActors.mockResolvedValue(null);
      conversationService.createConversation.mockRejectedValue(
        new Error('boom: simulated QueryFailedError')
      );

      const result = await service.createConversationFromExternal({
        creatorActorId: creatorId,
        memberActorIds: [memberId],
        isDirect: true,
      });

      expect(result).toEqual({
        kind: 'rejected',
        reason: MessagingRejectionReason.INTERNAL_ERROR,
      });
      expect(
        subscriptionPublishService.publishConversationEvent
      ).not.toHaveBeenCalled();
    });
  });

  describe('isGuidanceEngineEnabled', () => {
    it('should return true when guidance engine is enabled in config', () => {
      configService.get.mockReturnValue(true);

      const result = service.isGuidanceEngineEnabled();

      expect(result).toBe(true);
    });

    it('should return false when guidance engine is disabled in config', () => {
      configService.get.mockReturnValue(false);

      const result = service.isGuidanceEngineEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getPlatformMessaging', () => {
    it('should throw EntityNotFoundException when platform is not found', async () => {
      const mockPlatformRepo = {
        createQueryBuilder: vi.fn().mockReturnValue({
          leftJoinAndSelect: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue(null),
        }),
      };
      entityManager.getRepository.mockReturnValue(mockPlatformRepo as any);

      await expect(service.getPlatformMessaging()).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when platform has no messaging', async () => {
      const mockPlatformRepo = {
        createQueryBuilder: vi.fn().mockReturnValue({
          leftJoinAndSelect: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue({
            messaging: null,
          }),
        }),
      };
      entityManager.getRepository.mockReturnValue(mockPlatformRepo as any);

      await expect(service.getPlatformMessaging()).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return messaging when platform and messaging exist', async () => {
      const mockMessaging = { id: 'platform-messaging' } as IMessaging;
      const mockPlatformRepo = {
        createQueryBuilder: vi.fn().mockReturnValue({
          leftJoinAndSelect: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue({
            messaging: mockMessaging,
          }),
        }),
      };
      entityManager.getRepository.mockReturnValue(mockPlatformRepo as any);

      const result = await service.getPlatformMessaging();

      expect(result).toBe(mockMessaging);
    });
  });

  describe('getConversationsForActor', () => {
    it('should return flat list of conversations for an actor', async () => {
      const mockConversation = { id: 'conv-1' } as IConversation;
      const mockQueryBuilder = {
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi
          .fn()
          .mockResolvedValue([{ conversation: mockConversation }]),
      };
      conversationMembershipRepo.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder) as any;

      const result = await service.getConversationsForActor(
        'messaging-1',
        'actor-1'
      );

      expect(result).toEqual([mockConversation]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'membership.actorID = :actorID',
        { actorID: 'actor-1' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.messagingId = :messagingId',
        { messagingId: 'messaging-1' }
      );
    });
  });
});
