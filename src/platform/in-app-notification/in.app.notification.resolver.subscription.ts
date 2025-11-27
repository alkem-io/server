import { Resolver, Int } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import {
  InAppNotificationReceivedSubscriptionPayload,
  InAppNotificationCounterSubscriptionPayload,
} from '@services/subscriptions/subscription-service/dto';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverSubscription {
  constructor(
    private subscriptionService: SubscriptionReadService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @TypedSubscription<InAppNotificationReceivedSubscriptionPayload, never>(
    () => IInAppNotification,
    {
      description:
        'New in-app notification received for the currently authenticated user.',
      async filter(
        this: InAppNotificationResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const agentInfo = context.req.user;
        return agentInfo?.userID === payload.notification.receiverID;
      },
      async resolve(
        this: InAppNotificationResolverSubscription,
        payload,
        _args,
        _context
      ) {
        if (!payload?.notification) {
          this.logger.warn(
            'Received empty payload for inAppNotificationReceived subscription',
            LogContext.IN_APP_NOTIFICATION
          );
          return null;
        }
        return {
          ...payload.notification,
          triggeredAt: new Date(payload.notification.triggeredAt),
        };
      },
    }
  )
  public async inAppNotificationReceived(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return this.subscriptionService.subscribeToInAppNotificationReceived();
  }

  @TypedSubscription<InAppNotificationCounterSubscriptionPayload, never>(
    () => Int,
    {
      description:
        'Counter of unread in-app notifications for the currently authenticated user.',
      async filter(
        this: InAppNotificationResolverSubscription,
        payload,
        _variables,
        context
      ) {
        const agentInfo = context.req.user;
        return agentInfo?.userID === payload.receiverID;
      },
      async resolve(
        this: InAppNotificationResolverSubscription,
        payload,
        _args,
        _context
      ) {
        if (!payload) {
          this.logger.warn(
            'Received empty payload for notificationsUnreadCount subscription',
            LogContext.IN_APP_NOTIFICATION
          );
          return 0;
        }
        return payload.count;
      },
    }
  )
  public async notificationsUnreadCount(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return this.subscriptionService.subscribeToInAppNotificationCounter();
  }
}
