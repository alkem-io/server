import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IPushSubscription } from '@domain/push-subscription/push.subscription.interface';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { UnsubscribeFromPushNotificationsInput } from './dto/push.subscription.dto.delete';
import { SubscribeToPushNotificationsInput } from './dto/push.subscription.dto.subscribe.input';

@Resolver()
export class PushSubscriptionResolverMutations {
  constructor(private pushSubscriptionService: PushSubscriptionService) {}

  @Mutation(() => IPushSubscription, {
    description:
      "Subscribe the current user's device to push notifications. If the subscription endpoint already exists, it is updated. If the user has reached the maximum number of subscriptions (10), the oldest subscription is automatically replaced.",
  })
  @Profiling.api
  async subscribeToPushNotifications(
    @CurrentActor() actorContext: ActorContext,
    @Args('subscriptionData')
    subscriptionData: SubscribeToPushNotificationsInput
  ): Promise<IPushSubscription> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Authentication required to subscribe to push notifications',
        LogContext.PUSH_NOTIFICATION
      );
    }
    return this.pushSubscriptionService.subscribe(
      actorContext.actorID,
      subscriptionData
    );
  }

  @Mutation(() => IPushSubscription, {
    description:
      'Remove a push notification subscription for the current user.',
  })
  @Profiling.api
  async unsubscribeFromPushNotifications(
    @CurrentActor() actorContext: ActorContext,
    @Args('subscriptionData')
    subscriptionData: UnsubscribeFromPushNotificationsInput
  ): Promise<IPushSubscription> {
    if (!actorContext.actorID) {
      throw new ForbiddenException(
        'Authentication required to unsubscribe from push notifications',
        LogContext.PUSH_NOTIFICATION
      );
    }
    return this.pushSubscriptionService.unsubscribe(
      subscriptionData.subscriptionID,
      actorContext.actorID
    );
  }
}
