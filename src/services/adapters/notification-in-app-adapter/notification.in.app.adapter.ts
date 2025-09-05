import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { CreateInAppNotificationInput } from '@platform/in-app-notification/dto/in.app.notification.create';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

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
    const savedNotifications =
      await this.inAppNotificationService.saveInAppNotifications(inApps);

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
  }
}
