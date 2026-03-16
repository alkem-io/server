import { LogContext } from '@common/enums';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import webpush from 'web-push';
import { PushNotificationMessage } from './push.notification.message';

@Injectable()
export class PushDeliveryService {
  private readonly maxAttempts: number;

  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxAttempts = this.configService.get<number>(
      'notifications.push.retry.max_attempts' as any
    );

    // Configure VAPID details
    const vapidPublicKey = this.configService.get<string>(
      'notifications.push.vapid.public_key' as any
    );
    const vapidPrivateKey = this.configService.get<string>(
      'notifications.push.vapid.private_key' as any
    );
    const vapidSubject = this.configService.get<string>(
      'notifications.push.vapid.subject' as any
    );

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }
  }

  @RabbitSubscribe({
    queue: 'alkemio-push-notifications',
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  async handlePushMessage(
    message: PushNotificationMessage
  ): Promise<void | Nack> {
    try {
      // Check retry count
      if (message.retryCount >= this.maxAttempts) {
        this.logger.verbose?.(
          {
            message: 'Push notification abandoned after max retries',
            subscriptionId: message.subscriptionId,
            retryCount: message.retryCount,
          },
          LogContext.PUSH_NOTIFICATION
        );
        return; // ack and drop
      }

      const pushSubscription = {
        endpoint: message.endpoint,
        keys: {
          p256dh: message.keys.p256dh,
          auth: message.keys.auth,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(message.payload)
      );

      // Success: update lastActiveDate
      await this.pushSubscriptionService.markActive(message.subscriptionId);

      this.logger.verbose?.(
        {
          message: 'Push notification delivered',
          subscriptionId: message.subscriptionId,
          eventType: message.payload.eventType,
        },
        LogContext.PUSH_NOTIFICATION
      );
    } catch (error: any) {
      if (error?.statusCode === 410) {
        // Subscription expired - mark and log
        await this.pushSubscriptionService.markExpired(message.subscriptionId);
        this.logger.verbose?.(
          {
            message: 'Push subscription expired (410 Gone)',
            subscriptionId: message.subscriptionId,
          },
          LogContext.PUSH_NOTIFICATION
        );
        return; // ack - no retry
      }

      // Transient error - nack for DLX requeue
      this.logger.verbose?.(
        {
          message: 'Push notification delivery failed, requeueing',
          subscriptionId: message.subscriptionId,
          retryCount: message.retryCount,
          error: error?.message,
        },
        LogContext.PUSH_NOTIFICATION
      );
      return new Nack(false); // nack without requeue (goes to DLX)
    }
  }
}
