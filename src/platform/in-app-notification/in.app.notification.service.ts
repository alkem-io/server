import { Brackets, Repository, In, Not, UpdateResult, FindOptionsWhere } from 'typeorm';
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
      .where('notification.receiverID = :receiverID', { receiverID })
      .andWhere('notification.state <> :archivedState', {
        archivedState: NotificationEventInAppState.ARCHIVED,
      });

    if (filter?.types && filter.types.length > 0) {
      queryBuilder.andWhere('notification.type IN (:...types)', {
        types: filter.types,
      });
    }

    // Use triggeredAt as the primary ordering for notifications
    // This ensures notifications are ordered by when they were actually triggered, not when saved
    queryBuilder.orderBy('notification.triggeredAt', 'DESC');

    // For cursor-based pagination, we need to use triggeredAt + id as composite cursor
    // to ensure stable pagination while maintaining semantic ordering
    if (paginationArgs.after || paginationArgs.before) {
      // If using cursor pagination, add secondary ordering by id for stability
      queryBuilder.addOrderBy('notification.id', 'DESC');
      return await this.getPaginatedNotificationsWithTriggeredAtCursor(
        queryBuilder,
        paginationArgs
      );
    } else {
      // For simple pagination (first page), we can use the standard approach
      return await getPaginationResults(queryBuilder, paginationArgs, 'DESC');
    }
  }

  private async getPaginatedNotificationsWithTriggeredAtCursor(
    queryBuilder: any,
    paginationArgs: PaginationArgs
  ): Promise<PaginatedInAppNotifications> {
    // Custom cursor-based pagination that uses triggeredAt instead of rowId
    const { first, after, last, before } = paginationArgs;
    const limit = first ?? last ?? 25;

    if (after) {
      // Parse the cursor to get triggeredAt value
      const afterNotification = await this.inAppNotificationRepo.findOne({
        where: { id: after },
      });
      if (afterNotification) {
        queryBuilder.andWhere(
          new Brackets(qb =>
            qb
              .where('notification.triggeredAt < :afterTriggeredAt', {
                afterTriggeredAt: afterNotification.triggeredAt,
              })
              .orWhere(
                '(notification.triggeredAt = :afterTriggeredAt AND notification.id < :afterId)',
                {
                  afterTriggeredAt: afterNotification.triggeredAt,
                  afterId: afterNotification.id,
                }
              )
          )
        );
      }
    }

    if (before) {
      // Parse the cursor to get triggeredAt value
      const beforeNotification = await this.inAppNotificationRepo.findOne({
        where: { id: before },
      });
      if (beforeNotification) {
        queryBuilder.andWhere(
          new Brackets(qb =>
            qb
              .where('notification.triggeredAt > :beforeTriggeredAt', {
                beforeTriggeredAt: beforeNotification.triggeredAt,
              })
              .orWhere(
                '(notification.triggeredAt = :beforeTriggeredAt AND notification.id > :beforeId)',
                {
                  beforeTriggeredAt: beforeNotification.triggeredAt,
                  beforeId: beforeNotification.id,
                }
              )
          )
        );
      }
    }

    queryBuilder.take(limit + 1); // Get one extra to check if there are more

    const items = await queryBuilder.getMany();
    const hasNextPage = items.length > limit;
    const hasPreviousPage = !!after || !!before;

    const actualItems = hasNextPage ? items.slice(0, limit) : items;
    const total = await queryBuilder.clone().getCount();

    return {
      total,
      items: actualItems,
      pageInfo: {
        startCursor: actualItems[0]?.id || null,
        endCursor: actualItems[actualItems.length - 1]?.id || null,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  public async updateNotificationState(
    ID: string,
    state: NotificationEventInAppState
  ): Promise<NotificationEventInAppState> {
    const notification = await this.getRawNotificationOrFail(ID);

    notification.state = state;

    // Persist the existing entity instance to prevent TypeORM from treating it as a
    // new record (which could happen when spreading into a plain object).
    const updatedNotification =
      await this.inAppNotificationRepo.save(notification);

    return updatedNotification.state;
  }

  async bulkUpdateNotificationStateByTypes(
    userId: string,
    state: NotificationEventInAppState,
    filter?: NotificationEventsFilterInput
  ): Promise<UpdateResult> {
    const where: FindOptionsWhere<InAppNotification> = {
      receiverID: userId,
      state: Not(NotificationEventInAppState.ARCHIVED),
    };

    // If filter is provided with specific types, only update those types
    // If no filter is provided, update all notifications
    if (filter?.types && filter.types.length > 0) {
      where.type = In(filter.types);
    }

    return this.inAppNotificationRepo.update(where, { state });
  }
}
