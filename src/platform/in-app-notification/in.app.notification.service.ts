import { Repository, In, UpdateResult } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly inAppNotificationRepo: Repository<InAppNotificationEntity>
  ) {}

  public async getRawNotificationOrFail(
    ID: string
  ): Promise<InAppNotificationEntity> {
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
    receiverID?: string
  ): Promise<InAppNotificationEntity[]> {
    const where = receiverID ? { receiverID } : {};
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
