import { Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, TypedSubscription } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { InAppNotificationReceivedSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InAppNotificationReceivedSubscriptionResult } from '@domain/in-app-notification-reader/dto/subscription';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverSubscription {
  constructor(private subscriptionService: SubscriptionReadService) {}

  @TypedSubscription<InAppNotificationReceivedSubscriptionPayload, never>(
    () => InAppNotificationReceivedSubscriptionResult,
    {
      description: 'New in-app notification received',
      async resolve(
        this: InAppNotificationResolverSubscription,
        payload,
        _args,
        context
      ) {
        return payload;
      },
      async filter(
        this: InAppNotificationResolverSubscription,
        payload,
        variables,
        context
      ) {
        return true;
      },
    }
  )
  public async inAppNotificationReceived(@CurrentUser() agentInfo: AgentInfo) {
    return this.subscriptionService.subscribeToInAppNotificationReceived();
  }
}
