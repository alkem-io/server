import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
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
import { Messaging } from './messaging.entity';
import { IMessaging } from './messaging.interface';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let conversationService: Mocked<ConversationService>;
  let _conversationAuthorizationService: Mocked<ConversationAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let _subscriptionPublishService: Mocked<SubscriptionPublishService>;
  let messagingRepo: Mocked<Repository<Messaging>>;
  let conversationMembershipRepo: Mocked<Repository<ConversationMembership>>;
  let entityManager: Mocked<EntityManager>;
  let configService: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(MessagingService);
    conversationService = module.get(ConversationService);
    _conversationAuthorizationService = module.get(
      ConversationAuthorizationService
    );
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    _subscriptionPublishService = module.get(SubscriptionPublishService);
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
      ).toHaveBeenCalledWith('agent-caller', 'agent-invited');
      expect(result).toBe(existingConversation);
      expect(conversationService.createConversation).not.toHaveBeenCalled();
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
