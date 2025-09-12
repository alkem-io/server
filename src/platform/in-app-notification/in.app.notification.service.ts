import { Repository, In, UpdateResult } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { NotificationEventsFilterInput } from '@services/api/me/dto/me.notification.event.filter.dto.input';
import { CreateInAppNotificationInput } from './dto/in.app.notification.create';
import { IInAppNotification } from './in.app.notification.interface';
import {
  PaginationArgs,
  PaginatedInAppNotifications,
  getPaginationResults,
} from '@core/pagination';

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
    filter?: NotificationEventsFilterInput
  ): Promise<IInAppNotification[]> {
    const where =
      filter && filter.types && filter.types.length > 0
        ? { receiverID, type: In(filter.types) }
        : { receiverID };
    return this.inAppNotificationRepo.find({
      where,
      order: { triggeredAt: 'desc' },
    });
  }

  public getRawNotificationsUnreadCount(
    receiverID: string,
    filter?: NotificationEventsFilterInput
  ): Promise<number> {
    const where =
      filter && filter.types && filter.types.length > 0
        ? {
            receiverID,
            state: NotificationEventInAppState.UNREAD,
            type: In(filter.types),
          }
        : { receiverID, state: NotificationEventInAppState.UNREAD };
    return this.inAppNotificationRepo.count({
      where,
    });
  }

  public async getPaginatedNotifications(
    receiverID: string,
    paginationArgs: PaginationArgs,
    filter?: NotificationEventsFilterInput
  ): Promise<PaginatedInAppNotifications> {
    const queryBuilder = this.inAppNotificationRepo
      .createQueryBuilder('notification')
      .where('notification.receiverID = :receiverID', { receiverID });

    if (filter?.types && filter.types.length > 0) {
      queryBuilder.andWhere('notification.type IN (:...types)', {
        types: filter.types,
      });
    }

    queryBuilder.orderBy('notification.triggeredAt', 'DESC');

    return await getPaginationResults(queryBuilder, paginationArgs, 'DESC');
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

  async markAllNotificationsAsState(
    userId: string,
    state: NotificationEventInAppState
  ): Promise<UpdateResult> {
    return this.inAppNotificationRepo.update({ receiverID: userId }, { state });
  }
}
