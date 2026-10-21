import { LogContext } from '@common/enums';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import webpush from 'web-push';
import { NativePushSenderService } from './native.push.sender.service';
import {
  NativePushNotificationMessage,
  PushNotificationMessage,
} from './push.notification.message';

@Injectable()
export class PushDeliveryService {
  private readonly maxAttempts: number;

  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private configService: ConfigService<AlkemioConfig, true>,
    private nativeSender: NativePushSenderService,
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

    if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }
  }

  @RabbitSubscribe({
    queue: 'alkemio-push-notifications',
    createQueueIfNotExists: true,
    queueOptions: { durable: true },
  })
  async handlePushMessage(
    message: PushNotificationMessage | NativePushNotificationMessage
  ): Promise<void | Nack> {
    // 086-app-push-mvp (FR-006). A native push is a TOTAL branch, taken before
    // the retry check and OUTSIDE the web `try` below: that catch is written
    // entirely around `message.subscriptionId`, so a native failure evaluated
    // there would call `markExpired(undefined)` against the live web-push
    // table. This catch is the ONE owner of "a throw must not escape the
    // handler" — an escaping throw is nacked with requeue = true by the
    // library's default REQUEUE behaviour and hot-loops the SHARED queue
    // forever, starving live web push at prefetchCount 10.
    if ('platform' in message) {
      try {
        await this.nativeSender.send(message);
      } catch (error: any) {
        this.logger.error?.(
          {
            message: 'Native push notification delivery failed, dropping',
            platform: message.platform,
            tokenTail: message.token.slice(-6),
            userId: message.userId,
            error: error?.message,
          },
          error?.stack,
          LogContext.PUSH_NOTIFICATION
        );
      }
      return;
    }

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

      // Transient error - log and ack to prevent tight redelivery loop.
      // Without a DLX configured on the queue, Nack causes immediate
      // redelivery which saturates the CPU. Instead we ack and drop;
      // the notification adapter will re-enqueue on the next event.
      this.logger.verbose?.(
        {
          message: 'Push notification delivery failed, dropping message',
          subscriptionId: message.subscriptionId,
          retryCount: message.retryCount,
          error: error?.message,
        },
        LogContext.PUSH_NOTIFICATION
      );

      // Mark subscription as expired only when the subscription is GONE.
      // RFC 8030 §7.3 treats 404 like the 410 handled above; every other 4xx
      // (a 429, a VAPID-misconfiguration 401) is transient and must NOT
      // permanently expire a live subscription.
      const statusCode = error?.statusCode;
      if (statusCode === 404) {
        await this.pushSubscriptionService.markExpired(message.subscriptionId);
      }

      return; // ack - drop the message
    }
  }
}
