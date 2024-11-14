import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationState } from '../in-app-notification/in.app.notification.state';

type InAppNotificationEvent = {
  /** UTC */
  triggeredAt: Date;
  type: NotificationEventType;
  triggeredByID?: string;
  resourceID?: string;
  category: string; // todo type
  receiverID: string;
  contributorID?: string;
  // action: string; // todo type ???
};
// todo: use this service in the controller
@Injectable()
export class InAppNotificationReceiver {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async store(events: InAppNotificationEvent[]) {
    const entities = events.map(event =>
      InAppNotificationEntity.create({
        ...event,
        state: InAppNotificationState.UNREAD,
      })
    );
    await this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
    return;
  }
}
