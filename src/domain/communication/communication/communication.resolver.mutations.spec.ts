import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { MessageSendLimitReachedException } from '@common/exceptions/message.send.limit.reached.exception';
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
import { MessagingService } from '../messaging/messaging.service';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { MessageSendAllowanceService } from './message.send.allowance.service';

describe('CommunicationResolverMutations', () => {
  let resolver: CommunicationResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let userService: Mocked<UserService>;
  let notificationUserAdapter: Mocked<NotificationUserAdapter>;
  let notificationOrganizationAdapter: Mocked<NotificationOrganizationAdapter>;
  let notificationSpaceAdapter: Mocked<NotificationSpaceAdapter>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;
  let messagingService: Mocked<MessagingService>;
  let allowance: Mocked<MessageSendAllowanceService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    messagingService = module.get(MessagingService);
    allowance = module.get(MessageSendAllowanceService);
    allowance.claim.mockResolvedValue(undefined);
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
          communication: { allowOtherUsersToContactViaEmail: true },
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

    it('should throw MessagingNotEnabledException when user does not allow email contact', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: { allowOtherUsersToContactViaEmail: false },
        },
      } as any);

      await expect(
        resolver.sendMessageToUsers(actorContext, {
          receiverIds: ['receiver-1'],
          message: 'Hello!',
        } as any)
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('gates on the email flag, not the chat flag — chat on but email off still throws', async () => {
      // The email transport must reject a recipient who allows chat but not
      // email contact, even though the chat flag is true (FR-011).
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: {
            allowOtherUsersToSendMessages: true,
            allowOtherUsersToContactViaEmail: false,
          },
        },
      } as any);

      await expect(
        resolver.sendMessageToUsers(actorContext, {
          receiverIds: ['receiver-1'],
          message: 'Hello!',
        } as any)
      ).rejects.toThrow(MessagingNotEnabledException);
    });

    it('sends when chat is off but email contact is on (the email-contact case)', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: {
            allowOtherUsersToSendMessages: false,
            allowOtherUsersToContactViaEmail: true,
          },
        },
      } as any);

      const result = await resolver.sendMessageToUsers(actorContext, {
        receiverIds: ['receiver-1'],
        message: 'Hello!',
      } as any);

      expect(result).toBe(true);
      expect(
        notificationUserAdapter.userToUserMessageDirect
      ).toHaveBeenCalled();
    });

    it('should send messages to multiple receivers', async () => {
      userService.getUserByIdOrFail.mockResolvedValue({
        id: 'receiver-1',
        settings: {
          communication: { allowOtherUsersToContactViaEmail: true },
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

  describe('send allowance', () => {
    const actorContext = { actorID: 'sender-1' } as ActorContext;
    const consenting = (id: string) =>
      ({
        id,
        settings: {
          communication: { allowOtherUsersToContactViaEmail: true },
        },
      }) as any;

    beforeEach(() => {
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        { id: 'platform-auth' } as any
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      userService.getUserByIdOrFail.mockImplementation(async id =>
        consenting(id as string)
      );
    });

    const sends: Array<{
      name: string;
      send: () => Promise<unknown>;
    }> = [
      {
        name: 'sendMessageToUsers',
        send: () =>
          resolver.sendMessageToUsers(actorContext, {
            receiverIds: ['receiver-1'],
            message: 'Hello!',
          } as any),
      },
      {
        name: 'sendDirectMessageToUsers',
        send: () =>
          resolver.sendDirectMessageToUsers(actorContext, {
            receiverIDs: ['receiver-1'],
            message: 'Hello!',
          } as any),
      },
      {
        name: 'sendMessageToOrganization',
        send: () =>
          resolver.sendMessageToOrganization(actorContext, {
            organizationId: 'org-1',
            message: 'Hello!',
          } as any),
      },
      {
        name: 'sendMessageToCommunityLeads',
        send: () =>
          resolver.sendMessageToCommunityLeads(actorContext, {
            communityId: 'community-1',
            message: 'Hello!',
          } as any),
      },
    ];

    const expectNothingDelivered = () => {
      expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
      expect(
        notificationUserAdapter.userToUserMessageDirect
      ).not.toHaveBeenCalled();
      expect(
        notificationOrganizationAdapter.organizationSendMessage
      ).not.toHaveBeenCalled();
      expect(
        notificationSpaceAdapter.spaceCommunicationMessage
      ).not.toHaveBeenCalled();
      expect(messagingService.sendDirectMessageToUsers).not.toHaveBeenCalled();
    };

    it.each(
      sends
    )('$name: a refused claim rejects the send and delivers nothing', async ({
      send,
    }) => {
      const refusal = new MessageSendLimitReachedException({
        userId: 'sender-1',
        action: 'any',
      });
      allowance.claim.mockRejectedValue(refusal);

      await expect(send()).rejects.toBe(refusal);
      expectNothingDelivered();
    });

    it.each(
      sends
    )('$name: a claim that fails with a database error rejects with it and delivers nothing', async ({
      send,
    }) => {
      const dbError = new Error('connection terminated');
      allowance.claim.mockRejectedValue(dbError);

      await expect(send()).rejects.toBe(dbError);
      expectNothingDelivered();
    });

    it.each(
      sends
    )('$name: an unauthorized caller is refused before any claim', async ({
      send,
    }) => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new ForbiddenAuthorizationPolicyException(
          'no access',
          AuthorizationPrivilege.READ_USERS,
          'platform-auth',
          'sender-1'
        );
      });

      await expect(send()).rejects.toBeInstanceOf(
        ForbiddenAuthorizationPolicyException
      );
      expect(allowance.claim).not.toHaveBeenCalled();
    });

    it('sendMessageToUsers counts and mails a repeated receiver once', async () => {
      await resolver.sendMessageToUsers(actorContext, {
        receiverIds: ['a', 'b', 'a'],
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        2,
        'sendMessageToUsers'
      );
      const mailed =
        notificationUserAdapter.userToUserMessageDirect.mock.calls.map(
          ([input]) => input.receiverID
        );
      expect(mailed).toEqual(['a', 'b']);
    });

    it('sendMessageToUsers counts the sender like any other receiver', async () => {
      await resolver.sendMessageToUsers(actorContext, {
        receiverIds: ['sender-1', 'b'],
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        2,
        'sendMessageToUsers'
      );
    });

    it('sendMessageToUsers stops at a receiver who does not accept contact and keeps the claim', async () => {
      userService.getUserByIdOrFail.mockImplementation(async id =>
        id === 'b'
          ? ({
              id,
              settings: {
                communication: { allowOtherUsersToContactViaEmail: false },
              },
            } as any)
          : consenting(id as string)
      );

      await expect(
        resolver.sendMessageToUsers(actorContext, {
          receiverIds: ['a', 'b', 'c'],
          message: 'Hello!',
        } as any)
      ).rejects.toBeInstanceOf(MessagingNotEnabledException);

      expect(allowance.claim).toHaveBeenCalledOnce();
      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        3,
        'sendMessageToUsers'
      );
      const mailed =
        notificationUserAdapter.userToUserMessageDirect.mock.calls.map(
          ([input]) => input.receiverID
        );
      expect(mailed).toEqual(['a']);
    });

    it('sendDirectMessageToUsers counts and delivers to distinct receivers other than the sender', async () => {
      messagingService.sendDirectMessageToUsers.mockResolvedValue([]);

      await resolver.sendDirectMessageToUsers(actorContext, {
        receiverIDs: ['sender-1', 'x', 'x', 'y'],
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        2,
        'sendDirectMessageToUsers'
      );
      expect(messagingService.sendDirectMessageToUsers).toHaveBeenCalledWith(
        'sender-1',
        ['x', 'y'],
        'Hello!'
      );
    });

    it('sendDirectMessageToUsers to only the sender consumes and delivers nothing', async () => {
      messagingService.sendDirectMessageToUsers.mockResolvedValue([]);

      await resolver.sendDirectMessageToUsers(actorContext, {
        receiverIDs: ['sender-1'],
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        0,
        'sendDirectMessageToUsers'
      );
      expect(messagingService.sendDirectMessageToUsers).toHaveBeenCalledWith(
        'sender-1',
        [],
        'Hello!'
      );
    });

    it('sendMessageToOrganization claims one message', async () => {
      await resolver.sendMessageToOrganization(actorContext, {
        organizationId: 'org-1',
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        1,
        'sendMessageToOrganization'
      );
    });

    it('sendMessageToCommunityLeads claims one message', async () => {
      await resolver.sendMessageToCommunityLeads(actorContext, {
        communityId: 'community-1',
        message: 'Hello!',
      } as any);

      expect(allowance.claim).toHaveBeenCalledWith(
        'sender-1',
        1,
        'sendMessageToCommunityLeads'
      );
    });
  });
});
