import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { IUser } from '@domain/community/user/user.interface';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MessagingPushBudgetService } from './messaging.push.budget.service';
import { PushNotificationMessage } from './push.notification.message';
import { PushThrottleService } from './push.throttle.service';

@Injectable()
export class NotificationPushAdapter {
  private readonly pushEnabled: boolean;

  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private pushThrottleService: PushThrottleService,
    private messagingPushBudgetService: MessagingPushBudgetService,
    private amqpConnection: AmqpConnection,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.pushEnabled = this.configService.get<boolean>(
      'notifications.push.enabled' as any
    );
  }

  async sendPushNotifications(
    pushRecipients: IUser[],
    event: NotificationEvent,
    payload: { title: string; body: string; url: string }
  ): Promise<void> {
    if (!this.pushEnabled || pushRecipients.length === 0) {
      return;
    }

    // Filter by the shared (non-messaging) throttle bucket.
    const allowedUserIds: string[] = [];
    for (const user of pushRecipients) {
      const allowed = await this.pushThrottleService.isAllowed(user.id);
      if (allowed) {
        allowedUserIds.push(user.id);
      }
    }

    await this.publishToSubscriptions(allowedUserIds, event, payload);
  }

  /**
   * 034-messaging-notifications (FR-012/D-9). Same delivery mechanism as
   * `sendPushNotifications`, but gated by the DISJOINT messaging push budget
   * rather than the shared throttle — chat volume can never starve other
   * notification types, and vice versa (independence in both directions,
   * US4-AS2).
   */
  async sendMessagingPushNotifications(
    pushRecipients: IUser[],
    event: NotificationEvent,
    payload: { title: string; body: string; url: string }
  ): Promise<void> {
    if (!this.pushEnabled || pushRecipients.length === 0) {
      return;
    }

    // sec-server-10: check the messaging push budget for every recipient
    // concurrently rather than sequentially (previously one Redis round
    // trip per recipient, awaited one at a time).
    const allowances = await Promise.all(
      pushRecipients.map(async user => ({
        userId: user.id,
        allowed: await this.messagingPushBudgetService.isAllowed(user.id),
      }))
    );
    const allowedUserIds = allowances
      .filter(allowance => allowance.allowed)
      .map(allowance => allowance.userId);

    await this.publishToSubscriptions(allowedUserIds, event, payload);
  }

  private async publishToSubscriptions(
    allowedUserIds: string[],
    event: NotificationEvent,
    payload: { title: string; body: string; url: string }
  ): Promise<void> {
    if (allowedUserIds.length === 0) {
      return;
    }

    // Get active subscriptions for allowed users
    const subscriptions =
      await this.pushSubscriptionService.getActiveSubscriptions(allowedUserIds);

    if (subscriptions.length === 0) {
      return;
    }

    // Publish one message per subscription to the push queue
    const timestamp = new Date().toISOString();
    for (const subscription of subscriptions) {
      const message: PushNotificationMessage = {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload: {
          title: payload.title,
          body: payload.body,
          url: payload.url,
          eventType: event,
          timestamp,
        },
        retryCount: 0,
      };

      try {
        await this.amqpConnection.publish(
          '',
          'alkemio-push-notifications',
          message
        );
      } catch (error: any) {
        this.logger.error?.(
          {
            message: 'Failed to publish push notification to queue',
            subscriptionId: subscription.id,
            error: error?.message,
          },
          error?.stack,
          LogContext.PUSH_NOTIFICATION
        );
      }
    }

    this.logger.verbose?.(
      {
        message: 'Push notifications queued',
        eventType: event,
        subscriptionCount: subscriptions.length,
        recipientCount: allowedUserIds.length,
      },
      LogContext.PUSH_NOTIFICATION
    );
  }
}
