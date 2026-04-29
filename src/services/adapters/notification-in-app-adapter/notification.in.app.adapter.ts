import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CreateInAppNotificationInput } from '@platform/in-app-notification/dto/in.app.notification.create';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class NotificationInAppAdapter {
  private static readonly NOT_SUPPORTED_IN_APP_EVENTS: NotificationEvent[] = [
    NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM,
  ];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionPublishService: SubscriptionPublishService,
    private inAppNotificationService: InAppNotificationService
  ) {}

  public async sendInAppNotifications(
    type: NotificationEvent,
    category: NotificationEventCategory,
    triggeredByID: string,
    receiverIDs: string[],
    payload: IInAppNotificationPayload
  ) {
    // Filter out unsupported notification types
    if (NotificationInAppAdapter.NOT_SUPPORTED_IN_APP_EVENTS.includes(type)) {
      this.logger.verbose?.(
        `Skipping in-app notification of type ${type} as it's not in the supported list`,
        LogContext.IN_APP_NOTIFICATION
      );
      return;
    }

    if (receiverIDs.length === 0) {
      this.logger.error(
        'Received in-app notification with no receiver IDs, skipping storage.',
        LogContext.IN_APP_NOTIFICATION
      );
      return;
    }

    this.logger.verbose?.(
      `Received ${receiverIDs?.length} in-app notifications with receiver IDs: ${receiverIDs.join(', ')}`,
      LogContext.IN_APP_NOTIFICATION
    );

    const inApps = receiverIDs.map(receiverID => {
      const inAppData: CreateInAppNotificationInput = {
        type,
        category,
        triggeredByID,
        triggeredAt: new Date(),
        payload,
        receiverID,
      };
      return this.inAppNotificationService.createInAppNotification(inAppData);
    });

    // filtering out notifications that are not for beta users now done by platform privilege
    let savedNotifications: IInAppNotification[];
    try {
      savedNotifications =
        await this.inAppNotificationService.saveInAppNotifications(inApps);
    } catch (error) {
      // Postgres FK violation (23503): the referenced entity (e.g.
      // invitation) was deleted between dispatch and insert. The
      // notification target is gone, so the notification itself is moot
      // — log a warn and skip rather than letting the rejection escape
      // to the fire-and-forget call site.
      if (this.isForeignKeyViolation(error)) {
        this.logger.warn?.(
          {
            message:
              'In-app notification target was deleted before insert; skipping',
            event: type,
            triggeredByID,
            receiverIDs,
            error: String(error),
          },
          LogContext.IN_APP_NOTIFICATION
        );
        return;
      }
      throw error;
    }

    // notify
    this.logger.verbose?.(
      'Notifying users about the received in-app notifications',
      LogContext.IN_APP_NOTIFICATION
    );
    await Promise.all(
      savedNotifications.map(x =>
        this.subscriptionPublishService.publishInAppNotificationReceived(x)
      )
    );

    // Update counters for each affected user - derive from actually saved notifications
    const uniqueReceiverIDs = [
      ...new Set(
        savedNotifications.map(notification => notification.receiverID)
      ),
    ];
    const counterUpdateResults = await Promise.allSettled(
      uniqueReceiverIDs.map(async receiverID => {
        const count =
          await this.inAppNotificationService.getRawNotificationsUnreadCount(
            receiverID
          );
        return this.subscriptionPublishService.publishInAppNotificationCounter(
          receiverID,
          count
        );
      })
    );

    // Log any counter update failures without failing the entire operation
    counterUpdateResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          'Failed to update notification counter for user.',
          LogContext.IN_APP_NOTIFICATION,
          {
            receiverID: uniqueReceiverIDs[index],
            reason: result.reason,
          }
        );
      }
    });
  }

  private isForeignKeyViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    // Different TypeORM/driver versions surface the SQLSTATE either on the
    // top-level error or nested under `driverError`; check both.
    const typedError = error as QueryFailedError & {
      code?: string;
      driverError?: { code?: string };
    };
    const code = typedError.code ?? typedError.driverError?.code;
    return code === '23503';
  }
}
