import { Repository, In, UpdateResult } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '@domain/in-app-notification/in.app.notification.entity';
import { InAppNotification } from '@domain/in-app-notification-reader/in.app.notification.interface';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class InAppNotificationReader {
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

  public getNotifications(receiverID?: string): Promise<InAppNotification[]> {
    return this.getRawNotifications(receiverID);
  }

  private getRawNotifications(
    receiverID?: string
  ): Promise<InAppNotificationEntity[]> {
    return this.inAppNotificationRepo.find({
      where: { receiverID },
      order: { triggeredAt: 'desc' },
    });
  }

  public async updateNotificationState(
    ID: string,
    state: InAppNotificationState
  ): Promise<InAppNotificationState> {
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
    state: InAppNotificationState
  ): Promise<UpdateResult> {
    return await this.inAppNotificationRepo.update(
      { id: In(notificationIds), receiverID: userId },
      { state }
    );
  }
}
