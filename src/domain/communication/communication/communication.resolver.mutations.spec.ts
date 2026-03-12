import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { pubSubEngineMockFactory } from '@test/utils/pub.sub.engine.mock.factory';
import { type Mocked } from 'vitest';
import { CommunicationResolverMutations } from './communication.resolver.mutations';

describe('CommunicationResolverMutations', () => {
  let resolver: CommunicationResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let userService: Mocked<UserService>;
  let notificationUserAdapter: Mocked<NotificationUserAdapter>;
  let notificationOrganizationAdapter: Mocked<NotificationOrganizationAdapter>;
  let notificationSpaceAdapter: Mocked<NotificationSpaceAdapter>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
        pubSubEngineMockFactory(SUBSCRIPTION_DISCUSSION_UPDATED),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CommunicationResolverMutations);
    authorizationService = module.get(AuthorizationService);
    userService = module.get(UserService);
    notificationUserAdapter = module.get(NotificationUserAdapter);
    notificationOrganizationAdapter = module.get(
      NotificationOrganizationAdapter
    );
    notificationSpaceAdapter = module.get(NotificationSpaceAdapter);
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('sendMessageToUsers', () => {
    const actorContext = { actorID: 'sender-1' } as ActorContext;

    beforeEach(() => {
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        { id: 'platform-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    });

    it('should send messages to each receiver', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: { allowOtherUsersToSendMessages: true },
        },
      } as any);

      const result = await resolver.sendMessageToUsers(actorContext, {
        receiverIds: ['receiver-1'],
        message: 'Hello!',
      } as any);

      expect(result).toBe(true);
      expect(
        notificationUserAdapter.userToUserMessageDirect
      ).toHaveBeenCalledWith({
        triggeredBy: 'sender-1',
        receiverID: 'receiver-1',
        message: 'Hello!',
      });
    });

    it('should throw MessagingNotEnabledException when user does not allow messages', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: { allowOtherUsersToSendMessages: false },
        },
      } as any);

      await expect(
        resolver.sendMessageToUsers(actorContext, {
          receiverIds: ['receiver-1'],
          message: 'Hello!',
        } as any)
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('should send messages to multiple receivers', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: { allowOtherUsersToSendMessages: true },
        },
      } as any);

      const result = await resolver.sendMessageToUsers(actorContext, {
        receiverIds: ['receiver-1', 'receiver-2'],
        message: 'Hello!',
      } as any);

      expect(result).toBe(true);
      expect(
        notificationUserAdapter.userToUserMessageDirect
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendMessageToOrganization', () => {
    it('should send notification to organization', async () => {
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        { id: 'platform-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);

      const actorContext = { actorID: 'sender-1' } as ActorContext;
      const result = await resolver.sendMessageToOrganization(actorContext, {
        organizationId: 'org-1',
        message: 'Hello org!',
      } as any);

      expect(result).toBe(true);
      expect(
        notificationOrganizationAdapter.organizationSendMessage
      ).toHaveBeenCalledWith({
        triggeredBy: 'sender-1',
        message: 'Hello org!',
        organizationID: 'org-1',
      });
    });
  });

  describe('sendMessageToCommunityLeads', () => {
    it('should send notification to community leads', async () => {
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        { id: 'platform-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);

      const actorContext = { actorID: 'sender-1' } as ActorContext;
      const result = await resolver.sendMessageToCommunityLeads(actorContext, {
        communityId: 'community-1',
        message: 'Hello leads!',
      } as any);

      expect(result).toBe(true);
      expect(
        notificationSpaceAdapter.spaceCommunicationMessage
      ).toHaveBeenCalledWith({
        triggeredBy: 'sender-1',
        communityID: 'community-1',
        message: 'Hello leads!',
      });
    });
  });
});
