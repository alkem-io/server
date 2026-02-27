import { CurrentActor, TypedSubscription } from '@common/decorators';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Int, Resolver } from '@nestjs/graphql';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import {
  InAppNotificationCounterSubscriptionPayload,
  InAppNotificationReceivedSubscriptionPayload,
} from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverSubscription {
  constructor(private subscriptionService: SubscriptionReadService) {}

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
        const actorContext = context.req.user;
        return actorContext?.actorID === payload.notification.receiverID;
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
  public async inAppNotificationReceived(
    @CurrentActor() actorContext: ActorContext
  ) {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { actorContext }
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
        const actorContext = context.req.user;
        return actorContext?.actorID === payload?.receiverID;
      },
      async resolve(
        this: InAppNotificationResolverSubscription,
        payload,
        _args,
        _context
      ) {
        return payload?.count;
      },
    }
  )
  public async notificationsUnreadCount(
    @CurrentActor() actorContext: ActorContext
  ) {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { actorContext }
      );
    }

    return this.subscriptionService.subscribeToInAppNotificationCounter();
  }
}
