import { Repository, In, UpdateResult } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { InAppNotificationFilterInput } from '@services/api/in-app-notification-reader/dto/in.app.notification.filter.dto.input';
import { CreateInAppNotificationInput } from './dto/in.app.notification.create';

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>
  ) {}

  public createInAppNotification(
    inAppData: CreateInAppNotificationInput
  ): InAppNotification {
    return this.inAppNotificationRepo.create({
      type: inAppData.type,
      category: inAppData.category,
      triggeredByID: inAppData.triggeredByID,
      triggeredAt: inAppData.triggeredAt,
      receiverID: inAppData.receiverID,
      state: NotificationEventInAppState.UNREAD,
      payload: inAppData.payload,
    });
  }

  public saveInAppNotifications(
    entities: InAppNotification[]
  ): Promise<InAppNotification[]> {
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }

  public async getRawNotificationOrFail(
    ID: string
  ): Promise<InAppNotification> {
    const notification = await this.inAppNotificationRepo.findOne({
      where: { id: ID },
    });

    if (!notification) {
      throw new EntityNotFoundException(
        'Notification with this ID not found',
        LogContext.IN_APP_NOTIFICATION,
        { id: ID }
      );
    }

    return notification;
  }

  public getRawNotifications(
    receiverID: string,
    filter?: InAppNotificationFilterInput
  ): Promise<InAppNotification[]> {
    const where = filter
      ? { receiverID, type: In(filter.types) }
      : { receiverID };
    return this.inAppNotificationRepo.find({
      where,
      order: { triggeredAt: 'desc' },
    });
  }

  public async updateNotificationState(
    ID: string,
    state: NotificationEventInAppState
  ): Promise<NotificationEventInAppState> {
    const notification = await this.getRawNotificationOrFail(ID);

    const updatedNotification = await this.inAppNotificationRepo.save({
      ...notification,
      state,
    });

    return updatedNotification.state;
  }

  async bulkUpdateNotificationState(
    notificationIds: string[],
    userId: string,
    state: NotificationEventInAppState
  ): Promise<UpdateResult> {
    return this.inAppNotificationRepo.update(
      { id: In(notificationIds), receiverID: userId },
      { state }
    );
  }
}
