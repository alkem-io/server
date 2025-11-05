import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { Brackets, FindOptionsWhere, In, Not, Repository, UpdateResult } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common/decorators';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventsFilterInput } from '@services/api/me/dto/me.notification.event.filter.dto.input';
import { CreateInAppNotificationInput } from './dto/in.app.notification.create';
import { IInAppNotification } from './in.app.notification.interface';
import { getPaginationResults, PaginatedInAppNotifications, PaginationArgs } from '@core/pagination';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InAppNotificationCoreEntityIds } from './in.app.notification.core.entity.ids';

@Injectable()
export class InAppNotificationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>
  ) {}

  public createInAppNotification(
    inAppData: CreateInAppNotificationInput
  ): InAppNotification {
    const coreEntityIds = this.extractCoreEntityIds(
      inAppData.type,
      inAppData.payload
    );

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
      roomID: coreEntityIds.roomID,
      // not a FK but still used for deletion
      messageID: coreEntityIds.messageID,
      contributorOrganizationID: coreEntityIds.contributorOrganizationID,
      contributorUserID: coreEntityIds.contributorUserID,
      contributorVcID: coreEntityIds.contributorVcID,
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

  public saveInAppNotifications(
    entities: InAppNotification[]
  ): Promise<InAppNotification[]> {
    return this.inAppNotificationRepo.save(entities, {
      chunk: 100,
    });
  }

  public async deleteAllByMessageId(messageID: string): Promise<void> {
    await this.inAppNotificationRepo.delete({ messageID });
  }

  /**
   * Extracts core entity IDs from the notification event for FK population.
   * Only core entities (whose deletion should cascade delete the notification) are extracted.
   * Secondary entities remain in the JSON payload only.
   *
   * FK Mapping Reference: docs/notification-entity-fk-mapping.csv
   *
   * This method maps notification EVENT types (not payload types) to their required FKs.
   */
  private extractCoreEntityIds(
    eventType: NotificationEvent,
    payload: any
  ): InAppNotificationCoreEntityIds {
    const result: InAppNotificationCoreEntityIds = {};

    switch (eventType) {
      // ========================================
      // PLATFORM NOTIFICATIONS
      // ========================================

      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED:
        result.roomID = payload.roomID;
        break;

      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
        result.messageID = payload.messageID;
        result.roomID = payload.roomID;
        break;

      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED:
        break;

      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED:
        result.userID = payload.userID;
        break;

      case NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED:
        // we want to keep this notification for audit/historical reasons
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED: // it's using the same payload as platform admin space created
      case NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED:
        result.spaceID = payload.spaceID;
        break;

      // ========================================
      // ORGANIZATION NOTIFICATIONS
      // ========================================

      case NotificationEvent.ORGANIZATION_ADMIN_MESSAGE:
        result.organizationID = payload.organizationID;
        break;
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
        // we want to keep this notification for audit/historical reasons
        break;

      case NotificationEvent.ORGANIZATION_ADMIN_MENTIONED:
        result.organizationID = payload.organizationID;
        break;

      // ========================================
      // SPACE NOTIFICATIONS
      // ========================================

      case NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION:
        result.spaceID = payload.spaceID;
        result.applicationID = payload.applicationID;
        break;

      case NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER:
        result.spaceID = payload.spaceID;
        // contributor FKs
        result.contributorOrganizationID =
          payload.contributorType === RoleSetContributorType.ORGANIZATION
            ? payload.contributorID
            : undefined;
        result.contributorUserID =
          payload.contributorType === RoleSetContributorType.USER
            ? payload.contributorID
            : undefined;
        result.contributorVcID =
          payload.contributorType === RoleSetContributorType.VIRTUAL
            ? payload.contributorID
            : undefined;
        break;

      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        result.contributionID = payload.contributionID;
        break;

      case NotificationEvent.SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED:
        result.spaceID = payload.spaceID;
        result.contributorVcID = payload.contributorID;
        break;

      case NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE:
        result.spaceID = payload.spaceID;
        break;

      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        result.spaceID = payload.spaceID;
        break;

      case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
        result.spaceID = payload.spaceID;
        result.calendarEventID = payload.calendarEventID;
        break;

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        break;

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        result.contributionID = payload.contributionID;
        break;

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        result.messageID = payload.messageID;
        result.roomID = payload.roomID;
        break;

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT:
        result.spaceID = payload.spaceID;
        result.calloutID = payload.calloutID;
        result.contributionID = payload.contributionID;
        result.messageID = payload.messageID;
        result.roomID = payload.roomID;
        break;

      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        result.spaceID = payload.spaceID;
        result.invitationID = payload.invitationID;
        break;

      // ========================================
      // USER NOTIFICATIONS
      // ========================================

      case NotificationEvent.USER_SIGN_UP_WELCOME:
        result.userID = payload.userID;
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_INVITATION:
        result.spaceID = payload.spaceID;
        result.invitationID = payload.invitationID;
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_JOINED:
        result.spaceID = payload.spaceID;
        result.userID = payload.contributorID;
        break;

      case NotificationEvent.USER_MESSAGE:
        result.userID = payload.userID;
        break;
      case NotificationEvent.USER_MESSAGE_SENDER:
        // we want to keep this notification for audit/historical reasons
        break;

      case NotificationEvent.USER_MENTIONED:
      case NotificationEvent.USER_COMMENT_REPLY:
        result.userID = payload.userID;
        result.messageID = payload.messageID;
        result.roomID = payload.roomID;
        break;

      // ========================================
      // VIRTUAL CONTRIBUTOR NOTIFICATIONS
      // ========================================

      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION:
        result.spaceID = payload.spaceID;
        result.contributorVcID = payload.contributorID;
        break;

      default:
        // Unknown event type - log warning but don't throw
        this.logger.warn?.(`Unknown notification event type: ${eventType}`);
        break;
    }

    return result;
  }
}
