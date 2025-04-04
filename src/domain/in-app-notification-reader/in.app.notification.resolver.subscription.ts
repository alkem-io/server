import { Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { InAppNotificationReceivedSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { InAppNotification } from '@domain/in-app-notification-reader/in.app.notification.interface';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverSubscription {
  constructor(private subscriptionService: SubscriptionReadService) {}

  @TypedSubscription<InAppNotificationReceivedSubscriptionPayload, never>(
    () => InAppNotification,
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
}
