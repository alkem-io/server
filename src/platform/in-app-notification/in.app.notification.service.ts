import { Brackets, Repository, In, UpdateResult } from 'typeorm';
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
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>
  ) {}

  public createInAppNotification(
    inAppData: CreateInAppNotificationInput
  ): InAppNotification {
    const coreEntityIds = this.extractCoreEntityIds(inAppData.payload);

    return this.inAppNotificationRepo.create({
      type: inAppData.type,
      category: inAppData.category,
      triggeredByID: inAppData.triggeredByID,
      triggeredAt: inAppData.triggeredAt,
      receiverID: inAppData.receiverID,
      state: NotificationEventInAppState.UNREAD,
      payload: inAppData.payload,
      // Populate core entity FKs for cascade deletion
      spaceID: coreEntityIds.spaceID,
      organizationID: coreEntityIds.organizationID,
      userID: coreEntityIds.userID,
      applicationID: coreEntityIds.applicationID,
      invitationID: coreEntityIds.invitationID,
      calloutID: coreEntityIds.calloutID,
      contributionID: coreEntityIds.contributionID,
    });
  }

  /**
   * Extracts core entity IDs from the notification payload for FK population.
   * Only core entities (whose deletion should cascade delete the notification) are extracted.
   * Secondary entities remain in the JSON payload only.
   */
  private extractCoreEntityIds(payload: any): {
    spaceID?: string;
    organizationID?: string;
    userID?: string;
    applicationID?: string;
    invitationID?: string;
    calloutID?: string;
    contributionID?: string;
  } {
    const result: any = {};

    switch (payload.type) {
      // Space notifications - space is core
      case NotificationEventPayload.SPACE:
      case NotificationEventPayload.SPACE_COMMUNITY_CONTRIBUTOR:
      case NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT:
      case NotificationEventPayload.SPACE_COMMUNICATION_UPDATE:
        result.spaceID = payload.spaceID;
        break;

      case NotificationEventPayload.SPACE_COMMUNITY_APPLICATION:
        result.spaceID = payload.spaceID;
        result.applicationID = payload.applicationID;
        break;

      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION:
      case NotificationEventPayload.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        result.spaceID = payload.spaceID;
        result.invitationID = payload.invitationID;
        break;

      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        break;

      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_COMMENT:
      case NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_POST_COMMENT:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        result.contributionID = payload.contributionID;
        break;

      // Organization notifications - organization is core
      case NotificationEventPayload.ORGANIZATION_MESSAGE_DIRECT:
      case NotificationEventPayload.ORGANIZATION_MESSAGE_ROOM:
        result.organizationID = payload.organizationID;
        break;

      // User notifications - user is core
      case NotificationEventPayload.USER:
      case NotificationEventPayload.USER_MESSAGE_DIRECT:
      case NotificationEventPayload.USER_MESSAGE_ROOM:
        result.userID = payload.userID;
        break;

      // Platform notifications - no core entity FKs (data stored in JSON)
      case NotificationEventPayload.PLATFORM_FORUM_DISCUSSION:
      case NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED:
      case NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE:
        // No FKs needed - these are platform-level or contain embedded data
        break;

      // Virtual Contributor notifications
      case NotificationEventPayload.VIRTUAL_CONTRIBUTOR:
        // TODO: Add VC FK when entity structure is confirmed
        break;

      default:
        // Unknown payload type - no FKs populated
        break;
    }

    return result;
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
