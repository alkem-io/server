import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InAppNotificationEntity } from '@domain/in-app-notification-reader/in.app.notification.entity';
import { InAppNotificationBuilder } from '@domain/in-app-notification-reader/in.app.notification.builder';
import { InAppNotification } from '@domain/in-app-notification-reader/dto/in.app.notification.interface';

// todo: use this service in the controller
@Injectable()
export class InAppNotificationReader {
  constructor(
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>,
    private readonly inAppNotificationBuilder: InAppNotificationBuilder
  ) {}

  public async getNotifications(
    receiverID: string
  ): Promise<InAppNotification[]> {
    const notificationsForReceiver = await this.getRawNotifications(receiverID);
    return this.inAppNotificationBuilder.build(notificationsForReceiver);
  }

  private getRawNotifications(
    receiverID: string
  ): Promise<InAppNotificationEntity[]> {
    return this.inAppNotificationRepo.findBy({
      receiverID,
    });
  }
}
