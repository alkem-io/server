import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { PushSubscriptionService } from '@platform/push-subscription/push.subscription.service';
import { AlkemioConfig } from '@src/types';
import * as webPush from 'web-push';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export interface PushNotificationPayloadData {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

@Injectable()
export class NotificationPushAdapter {
  private readonly pushEnabled: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private pushSubscriptionService: PushSubscriptionService
  ) {
    const notificationsConfig = this.configService.get('notifications', {
      infer: true,
    });
    this.pushEnabled = notificationsConfig.push.enabled;

    if (this.pushEnabled) {
      const vapidSubject = notificationsConfig.push.vapid_subject;
      const vapidPublicKey = notificationsConfig.push.vapid_public_key;
      const vapidPrivateKey = notificationsConfig.push.vapid_private_key;

      if (vapidPublicKey && vapidPrivateKey) {
        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        this.logger.verbose?.(
          'Web Push VAPID details configured successfully',
          LogContext.NOTIFICATIONS
        );
      } else {
        this.logger.warn(
          'Push notifications enabled but VAPID keys are not configured',
          LogContext.NOTIFICATIONS
        );
      }
    }
  }

  public async sendPushNotifications(
    type: NotificationEvent,
    receiverIDs: string[],
    payloadData: PushNotificationPayloadData
  ): Promise<void> {
    if (!this.pushEnabled) {
      return;
    }

    if (receiverIDs.length === 0) {
      return;
    }

    const subscriptions =
      await this.pushSubscriptionService.findByUserIDs(receiverIDs);

    if (subscriptions.length === 0) {
      this.logger.verbose?.(
        `No push subscriptions found for ${receiverIDs.length} receivers`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    this.logger.verbose?.(
      `Sending push notifications to ${subscriptions.length} subscription(s) for event ${type}`,
      LogContext.NOTIFICATIONS
    );

    const payload = JSON.stringify(payloadData);

    const results = await Promise.allSettled(
      subscriptions.map(async subscription => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
            {
              TTL: 86400, // 24 hours
              urgency: 'normal',
              topic: payloadData.tag,
            }
          );
        } catch (error: any) {
          // 410 Gone = subscription has expired, clean it up
          if (error?.statusCode === 410 || error?.statusCode === 404) {
            this.logger.verbose?.(
              `Push subscription expired (${error.statusCode}), removing`,
              LogContext.NOTIFICATIONS
            );
            await this.pushSubscriptionService.deleteByID(subscription.id);
          } else {
            throw error;
          }
        }
      })
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `${failures.length}/${subscriptions.length} push notification(s) failed`,
        LogContext.NOTIFICATIONS
      );
    }
  }

  /**
   * Build a generic push payload from a notification event type.
   * Uses static English strings; the client can localize via inline rendering.
   */
  public buildPushPayload(
    type: NotificationEvent,
    triggeredByName?: string,
    context?: { spaceName?: string; url?: string }
  ): PushNotificationPayloadData {
    const actor = triggeredByName ?? 'Someone';
    const space = context?.spaceName ? ` in ${context.spaceName}` : '';

    const payloads: Partial<
      Record<NotificationEvent, PushNotificationPayloadData>
    > = {
      [NotificationEvent.USER_MENTIONED]: {
        title: 'You were mentioned',
        body: `${actor} mentioned you${space}`,
        tag: 'user-mention',
      },
      [NotificationEvent.USER_MESSAGE]: {
        title: 'New message',
        body: `${actor} sent you a direct message`,
        tag: 'user-message',
      },
      [NotificationEvent.USER_COMMENT_REPLY]: {
        title: 'Reply to your comment',
        body: `${actor} replied to your comment`,
        tag: 'comment-reply',
      },
      [NotificationEvent.USER_SPACE_COMMUNITY_INVITATION]: {
        title: 'Space invitation',
        body: `${actor} invited you to join a space`,
        tag: 'space-invitation',
      },
      [NotificationEvent.USER_SPACE_COMMUNITY_JOINED]: {
        title: 'Welcome!',
        body: `You joined a new community${space}`,
        tag: 'space-joined',
      },
      [NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED]: {
        title: 'Application update',
        body: `Your application was declined`,
        tag: 'application-declined',
      },
      [NotificationEvent.USER_SIGN_UP_WELCOME]: {
        title: 'Welcome to Alkemio!',
        body: 'Welcome to the platform!',
        tag: 'welcome',
      },
      [NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED]: {
        title: 'New post published',
        body: `A new post was published${space}`,
        tag: 'callout-published',
      },
      [NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT]: {
        title: 'New comment',
        body: `${actor} commented on a post${space}`,
        tag: 'callout-comment',
      },
      [NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION]: {
        title: 'New contribution',
        body: `${actor} created a contribution${space}`,
        tag: 'callout-contribution',
      },
      [NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT]:
        {
          title: 'Comment on contribution',
          body: `${actor} commented on a contribution${space}`,
          tag: 'contribution-comment',
        },
      [NotificationEvent.SPACE_COMMUNICATION_UPDATE]: {
        title: 'Space update',
        body: `${actor} shared an update${space}`,
        tag: 'space-update',
      },
      [NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION]: {
        title: 'New application',
        body: `${actor} applied to join${space}`,
        tag: 'community-application',
      },
      [NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER]: {
        title: 'New member',
        body: `A new member joined${space}`,
        tag: 'new-member',
      },
      [NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE]: {
        title: 'Message to space leads',
        body: `${actor} sent a message to the leads${space}`,
        tag: 'lead-message',
      },
      [NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED]: {
        title: 'New event',
        body: `A new event was scheduled${space}`,
        tag: 'calendar-event',
      },
      [NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT]: {
        title: 'Event comment',
        body: `${actor} commented on an event${space}`,
        tag: 'calendar-event-comment',
      },
      [NotificationEvent.ORGANIZATION_ADMIN_MESSAGE]: {
        title: 'Organization message',
        body: `${actor} sent a message to your organization`,
        tag: 'org-message',
      },
      [NotificationEvent.ORGANIZATION_ADMIN_MENTIONED]: {
        title: 'Organization mentioned',
        body: `${actor} mentioned your organization`,
        tag: 'org-mention',
      },
      [NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED]: {
        title: 'New forum discussion',
        body: `${actor} started a new discussion`,
        tag: 'forum-discussion',
      },
      [NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT]: {
        title: 'Forum comment',
        body: `${actor} commented on a forum discussion`,
        tag: 'forum-comment',
      },
      [NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED]: {
        title: 'New user registered',
        body: `${actor} signed up to the platform`,
        tag: 'user-registered',
      },
      [NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED]: {
        title: 'Role change',
        body: `A global role was changed`,
        tag: 'role-change',
      },
      [NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED]: {
        title: 'New space created',
        body: `${actor} created a new space`,
        tag: 'space-created',
      },
    };

    const result = payloads[type] ?? {
      title: 'Alkemio',
      body: 'You have a new notification',
      tag: 'generic',
    };

    if (context?.url) {
      result.url = context.url;
    }

    return result;
  }
}
