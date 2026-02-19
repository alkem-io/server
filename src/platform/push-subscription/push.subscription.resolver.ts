import { CurrentUser } from '@common/decorators';
import { ForbiddenException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PushSubscriptionService } from './push.subscription.service';
import { PushSubscriptionInput } from './dto/push.subscription.input';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { AlkemioConfig } from '@src/types';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class PushSubscriptionResolver {
  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {}

  @Query(() => String, {
    description:
      'The VAPID public key for subscribing to push notifications. Returns empty string if push is not configured.',
  })
  public pushNotificationVapidPublicKey(): string {
    const notificationsConfig = this.configService.get('notifications', {
      infer: true,
    });
    if (!notificationsConfig.push.enabled) {
      return '';
    }
    return notificationsConfig.push.vapid_public_key;
  }

  @Mutation(() => Boolean, {
    description:
      'Subscribe the current user to push notifications on a specific device/browser.',
  })
  public async subscribeToPushNotifications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') input: PushSubscriptionInput
  ): Promise<boolean> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User must be authenticated to subscribe to push notifications.',
        LogContext.NOTIFICATIONS
      );
    }

    const notificationsConfig = this.configService.get('notifications', {
      infer: true,
    });
    if (!notificationsConfig.push.enabled) {
      return false;
    }

    await this.pushSubscriptionService.createOrUpdate(
      agentInfo.userID,
      input.endpoint,
      input.p256dh,
      input.auth
    );

    return true;
  }

  @Mutation(() => Boolean, {
    description:
      'Unsubscribe from push notifications for a specific device/browser.',
  })
  public async unsubscribeFromPushNotifications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('endpoint') endpoint: string
  ): Promise<boolean> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User must be authenticated to unsubscribe from push notifications.',
        LogContext.NOTIFICATIONS
      );
    }

    return this.pushSubscriptionService.deleteByEndpoint(endpoint);
  }
}
