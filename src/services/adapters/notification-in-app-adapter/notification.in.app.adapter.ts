import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationPayloadBase } from './dto/notification.in.app.payload.base';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';

@Injectable()
export class NotificationInAppAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionPublishService: SubscriptionPublishService,
    private inAppNotificationService: InAppNotificationService
  ) {}

  public async sendInAppNotifications(
    notification: InAppNotificationPayloadBase,
    receiverIDs: string[]
  ) {
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

    // filtering out notifications that are not for beta users now done by platform privilege
    const savedNotifications = await this.store(notification, receiverIDs);

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

  private async store(
    payload: InAppNotificationPayloadBase,
    receiverIDs: string[]
  ): Promise<InAppNotification[]> {
    // create a version of the payload without the type, category, triggeredAt, triggeredBy
    const { type, category, triggeredAt, triggeredByID, ...payloadRest } =
      payload;
    const entities = receiverIDs.map(receiverID =>
      this.inAppNotificationService.createInAppNotification({
        type,
        category,
        triggeredByID,
        triggeredAt,
        receiverID,
        payload: payloadRest,
      })
    );
    return this.inAppNotificationService.saveInAppNotifications(entities);
  }
}
