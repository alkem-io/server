import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { InAppNotificationEntity } from '@domain/in-app-notification/in.app.notification.entity';
import { InAppNotificationBuilder } from '@domain/in-app-notification-reader/in.app.notification.builder';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';

type InAppNotificationEvent = {
  /** UTC */
  triggeredAt: number;
  type: NotificationEventType;
  state: InAppNotificationState;
  triggeredByID: string;
  resourceID: string;
  category: string; // todo type
  receiverID: string;
  // action: string; // todo type ???
};
// todo: use this service in the controller
@Injectable()
export class InAppNotificationReceiver {
  constructor(
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>,
    private readonly inAppNotificationBuilder: InAppNotificationBuilder
  ) {}

  public async store(events: InAppNotificationEvent[]) {
    await this.inAppNotificationRepo.save(events, {
      chunk: 100,
    });
    return;
  }
}
