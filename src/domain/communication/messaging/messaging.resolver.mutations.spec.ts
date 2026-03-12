import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
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
  let virtualActorLookupService: Mocked<VirtualActorLookupService>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MessagingResolverMutations);
    authorizationService = module.get(AuthorizationService);
    messagingService = module.get(MessagingService);
    userLookupService = module.get(UserLookupService);
    virtualActorLookupService = module.get(VirtualActorLookupService);
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

    it('should create a USER_USER conversation', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      // First call: checkReceivingUserAccessAndSettings (for 'other-user')
      // Second call: resolve current user agent ID (for actorContext.actorID = 'user-1')
      // Third call: resolve other user agent ID (for 'other-user')
      userLookupService.getUserByIdOrFail
        .mockResolvedValueOnce({
          id: 'other-user',
          authorization: { id: 'user-auth' },
          settings: {
            communication: { allowOtherUsersToSendMessages: true },
          },
        } as any)
        .mockResolvedValueOnce({ id: 'user-1' } as any) // caller
        .mockResolvedValueOnce({ id: 'other-user' } as any); // invited
      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        userID: 'other-user',
      } as any);

      expect(result).toBe(mockConversation);
      expect(messagingService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          callerAgentId: 'user-1',
          invitedAgentId: 'other-user',
        })
      );
    });

    it('should create a USER_VC conversation with virtualContributorID', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      userLookupService.getUserByIdOrFail.mockResolvedValue({
        id: 'user-1',
      } as any);
      virtualActorLookupService.getVirtualContributorByIdOrFail.mockResolvedValue(
        { id: 'vc-agent-1' } as any
      );
      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        virtualContributorID: 'vc-1',
      } as any);

      expect(result).toBe(mockConversation);
      expect(messagingService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          callerAgentId: 'user-1',
          invitedAgentId: 'vc-agent-1',
        })
      );
    });

    it('should throw MessagingNotEnabledException when receiving user has messaging disabled', async () => {
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        id: 'other-user',
        authorization: { id: 'user-auth' },
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      } as any);

      await expect(
        resolver.createConversation(actorContext, {
          userID: 'other-user',
        } as any)
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('should throw EntityNotInitializedException when user settings not loaded', async () => {
      userLookupService.getUserByIdOrFail.mockResolvedValue({
        id: 'other-user',
        authorization: { id: 'user-auth' },
        settings: undefined,
      } as any);

      await expect(
        resolver.createConversation(actorContext, {
          userID: 'other-user',
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should create conversation with wellKnownVirtualContributor', async () => {
      const mockConversation = { id: 'conv-1' } as any;

      userLookupService.getUserByIdOrFail.mockResolvedValue({
        id: 'user-1',
      } as any);
      messagingService.createConversation.mockResolvedValue(mockConversation);

      const result = await resolver.createConversation(actorContext, {
        wellKnownVirtualContributor: 'CHAT_GUIDANCE',
      } as any);

      expect(result).toBe(mockConversation);
      expect(messagingService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          callerAgentId: 'user-1',
          wellKnownVirtualContributor: 'CHAT_GUIDANCE',
        })
      );
    });
  });
});
