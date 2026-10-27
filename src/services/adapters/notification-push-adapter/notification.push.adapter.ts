import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { IUser } from '@domain/community/user/user.interface';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  NativePushNotificationMessage,
  PushNotificationMessage,
} from './push.notification.message';
import { PushThrottleService } from './push.throttle.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  /** FR-024 — collapse key. Omitted by notification kinds that should stack. */
  tag?: string;
}

@Injectable()
export class NotificationPushAdapter {
  private readonly pushEnabled: boolean;

  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private devicePushTokenService: DevicePushTokenService,
    private pushThrottleService: PushThrottleService,
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
    payload: PushNotificationPayload
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
   * 034-messaging-notifications (FR-012 / Operator Ruling R4 / D-21).
   *
   * Same delivery mechanism as `sendPushNotifications`, but with NO rate
   * limiter of any kind. That is deliberate, not an omission:
   *
   *  - the shared `PushThrottleService` bucket is untouched, so chat volume
   *    can never starve mentions/invitations (US4-AS2), and
   *  - a messaging-specific budget was DELETED by D-21, because the FR-011b
   *    delay cap already bounds the dispatch rate per recipient to a fixed
   *    function of configuration (worst case 12 direct + 4 group pushes an
   *    hour), independent of message volume. A counter that can only trip
   *    after a hard cap already bounded the rate adds a failure mode without
   *    adding a guarantee.
   *
   * Independence is therefore by NON-PARTICIPATION: a messaging push touches
   * no `push:throttle:*` key at all.
   */
  async sendMessagingPushNotifications(
    pushRecipients: IUser[],
    event: NotificationEvent,
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!this.pushEnabled || pushRecipients.length === 0) {
      return;
    }

    await this.publishToSubscriptions(
      pushRecipients.map(user => user.id),
      event,
      payload
    );
  }

  private async publishToSubscriptions(
    allowedUserIds: string[],
    event: NotificationEvent,
    payload: PushNotificationPayload
  ): Promise<void> {
    if (allowedUserIds.length === 0) {
      return;
    }

    // Get active subscriptions for allowed users
    const subscriptions =
      await this.pushSubscriptionService.getActiveSubscriptions(allowedUserIds);

    // 086-app-push-mvp (FR-005 / D-22). Read device tokens BEFORE the early
    // return: the MVP's primary recipient has a phone and no browser
    // subscription at all, and the unwidened guard dropped them silently.
    const tokens =
      await this.devicePushTokenService.getTokensForUsers(allowedUserIds);

    if (subscriptions.length === 0 && tokens.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const payloadEnvelope = {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      eventType: event,
      timestamp,
      ...(payload.tag ? { tag: payload.tag } : {}),
    };

    // Publish one message per subscription to the push queue
    for (const subscription of subscriptions) {
      const message: PushNotificationMessage = {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload: payloadEnvelope,
        retryCount: 0,
      };

      await this.publishToQueue(message, {
        subscriptionId: subscription.id,
      });
    }

    // ...and one message per device token, to the SAME queue. No event filter:
    // the transport is per-recipient and event-agnostic by ruling.
    for (const deviceToken of tokens) {
      const message: NativePushNotificationMessage = {
        userId: deviceToken.userId,
        platform: deviceToken.platform,
        token: deviceToken.token,
        payload: payloadEnvelope,
      };

      await this.publishToQueue(message, {
        userId: deviceToken.userId,
        platform: deviceToken.platform,
      });
    }

    this.logger.verbose?.(
      {
        message: 'Push notifications queued',
        eventType: event,
        subscriptionCount: subscriptions.length,
        tokenCount: tokens.length,
        recipientCount: allowedUserIds.length,
      },
      LogContext.PUSH_NOTIFICATION
    );
  }

  /**
   * One publish, one failure disposition. A publish failure for one recipient
   * must never abort the fan-out for the others, so the catch is here rather
   * than around the loops.
   */
  private async publishToQueue(
    message: PushNotificationMessage | NativePushNotificationMessage,
    identity: Record<string, string>
  ): Promise<void> {
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
          ...identity,
          error: error?.message,
        },
        error?.stack,
        LogContext.PUSH_NOTIFICATION
      );
    }
  }
}
