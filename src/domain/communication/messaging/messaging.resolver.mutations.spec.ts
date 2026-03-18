import { ConversationCreationType } from '@common/enums/conversation.creation.type';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { MessagingResolverMutations } from './messaging.resolver.mutations';
import { MessagingService } from './messaging.service';

describe('MessagingResolverMutations', () => {
  let resolver: MessagingResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let messagingService: Mocked<MessagingService>;
  let userLookupService: Mocked<UserLookupService>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MessagingResolverMutations);
    authorizationService = module.get(AuthorizationService);
    messagingService = module.get(MessagingService);
    userLookupService = module.get(UserLookupService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createConversation', () => {
    beforeEach(() => {
      messagingService.getPlatformMessaging.mockResolvedValue({
        id: 'messaging-1',
        authorization: { id: 'auth-1' },
      } as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    });

    it('should create a DIRECT conversation with a user', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      userLookupService.getUserById.mockResolvedValue({
        id: 'other-user',
        authorization: { id: 'user-auth' },
        settings: {
          communication: { allowOtherUsersToSendMessages: true },
        },
      } as any);
      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        type: ConversationCreationType.DIRECT,
        memberIDs: ['other-user'],
      } as any);

      expect(result).toBe(mockConversation);
      expect(messagingService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          callerActorId: 'user-1',
          memberActorIds: ['other-user'],
          type: ConversationCreationType.DIRECT,
        })
      );
    });

    it('should create a GROUP conversation', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        type: ConversationCreationType.GROUP,
        memberIDs: ['user-2', 'user-3'],
        displayName: 'Test Group',
      } as any);

      expect(result).toBe(mockConversation);
      expect(messagingService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          callerActorId: 'user-1',
          memberActorIds: ['user-2', 'user-3'],
          type: ConversationCreationType.GROUP,
          displayName: 'Test Group',
        })
      );
    });

    it('should throw MessagingNotEnabledException when receiving user has messaging disabled', async () => {
      userLookupService.getUserById.mockResolvedValue({
        id: 'other-user',
        authorization: { id: 'user-auth' },
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      } as any);

      await expect(
        resolver.createConversation(actorContext, {
          type: ConversationCreationType.DIRECT,
          memberIDs: ['other-user'],
        } as any)
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('should throw EntityNotInitializedException when user settings not loaded', async () => {
      userLookupService.getUserById.mockResolvedValue({
        id: 'other-user',
        authorization: { id: 'user-auth' },
        settings: undefined,
      } as any);

      await expect(
        resolver.createConversation(actorContext, {
          type: ConversationCreationType.DIRECT,
          memberIDs: ['other-user'],
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should skip user settings check for DIRECT with non-user member (e.g. VC)', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      // getUserById returns null → not a user, skip settings check
      userLookupService.getUserById.mockResolvedValue(null as any);
      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        type: ConversationCreationType.DIRECT,
        memberIDs: ['vc-1'],
      } as any);

      expect(result).toBe(mockConversation);
    });
  });
});
