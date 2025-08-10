import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InAppNotificationEntity } from '@platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationPayloadBase } from './dto/notification.in.app.payload.base';

@Injectable()
export class NotificationInAppAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionPublishService: SubscriptionPublishService,
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async decompressStoreNotify(
    notification: InAppNotificationPayloadBase
  ) {
    if (!notification.receiverIDs || notification.receiverIDs.length === 0) {
      this.logger.error(
        'Received in-app notification with no receiver IDs, skipping storage.',
        LogContext.IN_APP_NOTIFICATION
      );
      return;
    }
    const receiverIDs = notification.receiverIDs;
    this.logger.verbose?.(
      `Received ${receiverIDs?.length} in-app notifications with receiver IDs: ${receiverIDs.join(', ')}`,
      LogContext.IN_APP_NOTIFICATION
    );

    // filtering out notifications that are not for beta users now done by platform privilege
    const savedNotifications = await this.store(notification);

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
    notification: InAppNotificationPayloadBase
  ): Promise<InAppNotificationEntity[]> {
    // Remove receiverIDs from the payload stored per entity to avoid duplication
    const {
      receiverIDs: receiverIDsFromNotification,
      ...payloadSansReceivers
    } = notification;
    const entities = receiverIDsFromNotification.map(receiverID =>
      InAppNotificationEntity.create({
        triggeredAt: notification.triggeredAt,
        type: notification.type,
        state: InAppNotificationState.UNREAD,
        category: notification.category,
        receiverID: receiverID,
        triggeredByID: notification.triggeredByID,
        payload: payloadSansReceivers,
      })
    );
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }
}
