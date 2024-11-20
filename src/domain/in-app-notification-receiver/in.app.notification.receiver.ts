import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { InAppNotificationPayload } from '@alkemio/notifications-lib';
// type InAppNotificationPayload = Record<string, any>;
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../in-app-notification/in.app.notification.state';

// todo: use this service in the controller
@Injectable()
export class InAppNotificationReceiver {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async store<T extends InAppNotificationPayload>(notifications: T[]) {
    const entities = notifications.map(notification =>
      InAppNotificationEntity.create({
        triggeredAt: notification.triggeredAt,
        type: notification.type,
        state: InAppNotificationState.UNREAD,
        category: notification.category,
        receiverID: notification.receiverID,
        triggeredByID: notification.triggeredByID,
        payload: notification,
      })
    );
    await this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
    return;
  }
}
