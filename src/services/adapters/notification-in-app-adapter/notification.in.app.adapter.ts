import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InAppNotificationEntity } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
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
  ): Promise<InAppNotificationEntity[]> {
    const entities = receiverIDs.map(receiverID =>
      InAppNotificationEntity.create({
        type: payload.type,
        category: payload.category,
        triggeredAt: payload.triggeredAt,
        state: NotificationEventInAppState.UNREAD,
        receiverID: receiverID,
        triggeredByID: payload.triggeredByID,
        payload: payload,
      })
    );
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }
}
