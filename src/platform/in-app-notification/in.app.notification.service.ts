import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LOADABLE_ACTOR_TYPES } from '@core/dataloader/creators/loader.creators/in-app-notification/loadable.actor.types';
import {
  getPaginationResults,
  PaginatedInAppNotifications,
  PaginationArgs,
} from '@core/pagination';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { NotificationEventsFilterInput } from '@services/api/me/dto/me.notification.event.filter.dto.input';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import {
  Brackets,
  FindOptionsWhere,
  In,
  Not,
  Repository,
  UpdateResult,
} from 'typeorm';
import {
  InAppNotificationPayloadOrganizationAssociateActor,
  InAppNotificationPayloadOrganizationAssociateInvitation,
  InAppNotificationPayloadOrganizationMessageDirect,
  InAppNotificationPayloadOrganizationMessageRoom,
} from '../in-app-notification-payload/dto/organization';
import { InAppNotificationPayloadPlatformForumDiscussion } from '../in-app-notification-payload/dto/platform';
import {
  InAppNotificationPayloadSpace,
  InAppNotificationPayloadSpaceCollaborationCallout,
  InAppNotificationPayloadSpaceCollaborationCalloutComment,
  InAppNotificationPayloadSpaceCollaborationCalloutPostComment,
  InAppNotificationPayloadSpaceCollaborationCalloutReaction,
  InAppNotificationPayloadSpaceCommunicationMessageDirect,
  InAppNotificationPayloadSpaceCommunicationUpdate,
  InAppNotificationPayloadSpaceCommunityActor,
  InAppNotificationPayloadSpaceCommunityApplication,
  InAppNotificationPayloadSpaceCommunityCalendarEvent,
  InAppNotificationPayloadSpaceCommunityCalendarEventComment,
  InAppNotificationPayloadSpaceCommunityInvitation,
  InAppNotificationPayloadSpaceCommunityInvitationPlatform,
} from '../in-app-notification-payload/dto/space';
import { InAppNotificationPayloadSpaceCollaborationPoll } from '../in-app-notification-payload/dto/space/notification.in.app.payload.space.collaboration.poll';
import {
  InAppNotificationPayloadUser,
  InAppNotificationPayloadUserMessageDirect,
  InAppNotificationPayloadUserMessageRoom,
} from '../in-app-notification-payload/dto/user';
import { InAppNotificationPayloadVirtualContributor } from '../in-app-notification-payload/dto/virtual-contributor';
import { CreateInAppNotificationInput } from './dto/in.app.notification.create';
import { InAppNotificationCoreEntityIds } from './in.app.notification.core.entity.ids';
import { IInAppNotification } from './in.app.notification.interface';

/** The columns that decide whether a notification can be shown. */
type NotificationVisibilityFields = {
  spaceID?: string | null;
  triggeredByID?: string | null;
};

const uniqueIDs = (ids: (string | null | undefined)[]): string[] => [
  ...new Set(ids.filter((id): id is string => !!id)),
];

@Injectable()
export class InAppNotificationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    @InjectRepository(InAppNotification)
    private readonly inAppNotificationRepo: Repository<InAppNotification>,
    private readonly authorizationService: AuthorizationService,
    private readonly actorContextService: ActorContextService,
    private readonly actorContextCacheService: ActorContextCacheService
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
      contributorActorId: coreEntityIds.contributorActorId,
      calendarEventID: coreEntityIds.calendarEventID,
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

  /**
   * The number of UNREAD notifications the receiver can see: a row
   * `filterVisibleNotifications` would hide from the notifications list is not
   * counted either. Rows are grouped by the two columns visibility depends on,
   * so the checks run once per distinct Space and triggering actor, never per
   * row.
   */
  public async getNotificationsUnreadCount(
    actorContext: ActorContext,
    filter?: NotificationEventsFilterInput
  ): Promise<number> {
    const queryBuilder = this.inAppNotificationRepo
      .createQueryBuilder('notification')
      .select('notification.spaceID', 'spaceID')
      .addSelect('notification.triggeredByID', 'triggeredByID')
      .addSelect('COUNT(*)', 'count')
      .where('notification.receiverID = :receiverID', {
        receiverID: actorContext.actorID,
      })
      .andWhere('notification.state = :unreadState', {
        unreadState: NotificationEventInAppState.UNREAD,
      });

    if (filter?.types && filter.types.length > 0) {
      queryBuilder.andWhere('notification.type IN (:...types)', {
        types: filter.types,
      });
    }

    const groups = await queryBuilder
      .groupBy('notification.spaceID')
      .addGroupBy('notification.triggeredByID')
      .getRawMany<{
        spaceID: string | null;
        triggeredByID: string | null;
        count: string | number;
      }>();

    const visibleGroups = await this.selectVisible(actorContext, groups);
    return visibleGroups.reduce(
      (total, group) => total + Number(group.count),
      0
    );
  }

  /**
   * The unread count for a receiver known only by ID (for example when a
   * notification is created and there is no request). The receiver's
   * ActorContext is the one their own requests use: the cached one when
   * present, otherwise built from their credentials the same way the
   * authentication path builds it. The built context is deliberately not
   * written to the cache — notification fan-out would otherwise fill it with
   * contexts of receivers who are not signed in, and race the invalidation
   * that runs when credentials change.
   */
  public async getNotificationsUnreadCountForReceiver(
    receiverID: string
  ): Promise<number> {
    let actorContext =
      await this.actorContextCacheService.getByActorID(receiverID);
    if (!actorContext) {
      actorContext = new ActorContext();
      await this.actorContextService.populateFromActorID(
        actorContext,
        receiverID
      );
    }
    return this.getNotificationsUnreadCount(actorContext);
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

  /**
   * Drops the notifications the receiver cannot be shown:
   * - the Space it references is not READ_ABOUT-able by the receiver. Every
   *   Space-scoped payload resolves the non-null `space.about`, and the list
   *   is `[InAppNotification!]!`, so a single unreadable Space would
   *   otherwise null the receiver's entire notifications list;
   * - the actor that triggered it no longer resolves (for example a deleted
   *   user — `triggeredByID` carries no foreign key). `triggeredBy` would be
   *   null and the notification has nobody to attribute it to.
   * `getNotificationsUnreadCount` applies the same rules, so the unread count
   * never includes a notification the list hides.
   */
  public filterVisibleNotifications<
    T extends Pick<InAppNotification, 'id' | 'spaceID' | 'triggeredByID'>,
  >(actorContext: ActorContext, notifications: T[]): Promise<T[]> {
    return this.selectVisible(
      actorContext,
      notifications,
      (notification, reason) =>
        this.logger.warn?.(
          {
            message: `Hiding in-app notification: ${reason}`,
            notificationId: notification.id,
            spaceId: notification.spaceID,
            triggeredById: notification.triggeredByID,
            receiverId: actorContext.actorID,
          },
          LogContext.IN_APP_NOTIFICATION
        )
    );
  }

  /**
   * The single visibility rule shared by the notifications list and the
   * unread count. Loads every referenced Space and triggering actor in one
   * query each, whatever the number of rows.
   */
  private async selectVisible<T extends NotificationVisibilityFields>(
    actorContext: ActorContext,
    rows: T[],
    onHidden?: (row: T, reason: string) => void
  ): Promise<T[]> {
    if (rows.length === 0) {
      return rows;
    }

    const [unreadableSpaceIDs, resolvableTriggerIDs] = await Promise.all([
      this.getUnreadableSpaceIDs(actorContext, rows),
      this.getResolvableTriggerIDs(rows),
    ]);

    return rows.filter(row => {
      if (!row.triggeredByID || !resolvableTriggerIDs.has(row.triggeredByID)) {
        onHidden?.(row, 'the actor that triggered it cannot be resolved');
        return false;
      }
      if (row.spaceID && unreadableSpaceIDs.has(row.spaceID)) {
        onHidden?.(row, 'receiver cannot read the Space it references');
        return false;
      }
      return true;
    });
  }

  private async getUnreadableSpaceIDs(
    actorContext: ActorContext,
    rows: NotificationVisibilityFields[]
  ): Promise<Set<string>> {
    const spaceIDs = uniqueIDs(rows.map(row => row.spaceID));
    if (spaceIDs.length === 0) {
      return new Set();
    }

    // Only the Space's policy is needed: skip the eager relations and the
    // Space's own columns.
    const spaces = await this.inAppNotificationRepo.manager.find(Space, {
      where: { id: In(spaceIDs) },
      relations: { authorization: true },
      select: {
        id: true,
        authorization: {
          id: true,
          type: true,
          credentialRules: true,
          privilegeRules: true,
        },
      },
      loadEagerRelations: false,
    });
    return new Set(
      spaces
        .filter(
          space =>
            !space.authorization ||
            !this.authorizationService.isAccessGranted(
              actorContext,
              space.authorization,
              AuthorizationPrivilege.READ_ABOUT
            )
        )
        .map(space => space.id)
    );
  }

  /** Resolvable means what the `triggeredBy` field's loader can load. */
  private async getResolvableTriggerIDs(
    rows: NotificationVisibilityFields[]
  ): Promise<Set<string>> {
    const triggerIDs = uniqueIDs(rows.map(row => row.triggeredByID));
    if (triggerIDs.length === 0) {
      return new Set();
    }

    const actors = await this.inAppNotificationRepo.manager.find(Actor, {
      select: { id: true },
      where: { id: In(triggerIDs), type: In(LOADABLE_ACTOR_TYPES) },
      loadEagerRelations: false,
    });
    return new Set(actors.map(actor => actor.id));
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

  public async deleteAllForReceiverInSpace(
    receiverID: string,
    spaceID: string
  ): Promise<void> {
    await this.inAppNotificationRepo.delete({
      receiverID,
      spaceID,
    });
  }

  /**
   * Deletes all notifications for a receiver in multiple spaces.
   * This is used when a user is removed from a parent space to clean up
   * notifications from all child spaces (L1, L2, etc.).
   * @param receiverID The user ID
   * @param spaceIDs Array of space IDs
   */
  public async deleteAllForReceiverInSpaces(
    receiverID: string,
    spaceIDs: string[]
  ): Promise<void> {
    if (spaceIDs.length === 0) {
      return;
    }

    await this.inAppNotificationRepo.delete({
      receiverID,
      spaceID: In(spaceIDs),
    });
  }

  public async deleteAllForReceiverInOrganization(
    receiverID: string,
    organizationID: string
  ): Promise<void> {
    await this.inAppNotificationRepo.delete({
      receiverID,
      organizationID,
    });
  }

  public async deleteAllForContributorActorInSpace(
    contributorActorId: string,
    spaceID: string
  ): Promise<void> {
    await this.inAppNotificationRepo.delete({
      contributorActorId,
      spaceID,
    });
  }

  /**
   * Deletes all notifications for a contributor (actor) in multiple spaces.
   * This is used when a contributor is removed from a parent space to clean up
   * notifications from all child spaces (L1, L2, etc.).
   * @param contributorActorId The Actor ID of the contributor
   * @param spaceIDs Array of space IDs
   */
  public async deleteAllForContributorActorInSpaces(
    contributorActorId: string,
    spaceIDs: string[]
  ): Promise<void> {
    if (spaceIDs.length === 0) {
      return;
    }

    await this.inAppNotificationRepo.delete({
      contributorActorId,
      spaceID: In(spaceIDs),
    });
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
        result.roomID = (
          payload as InAppNotificationPayloadPlatformForumDiscussion
        ).discussion.roomID;
        break;

      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
        result.messageID = (
          payload as InAppNotificationPayloadPlatformForumDiscussion
        ).comment?.id;
        result.roomID = (
          payload as InAppNotificationPayloadPlatformForumDiscussion
        ).discussion.roomID;
        break;

      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED:
        break;

      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED:
        result.userID = (payload as InAppNotificationPayloadUser).userID;
        break;

      case NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED:
        // we want to keep this notification for audit/historical reasons
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED: // it's using the same payload as platform admin space created
      case NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED:
        result.spaceID = (payload as InAppNotificationPayloadSpace).spaceID;
        break;

      // ========================================
      // ORGANIZATION NOTIFICATIONS
      // ========================================

      case NotificationEvent.ORGANIZATION_ADMIN_MESSAGE:
        result.organizationID = (
          payload as InAppNotificationPayloadOrganizationMessageDirect
        ).organizationID;
        break;
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
        // we want to keep this notification for audit/historical reasons
        break;

      case NotificationEvent.ORGANIZATION_ADMIN_MENTIONED:
        result.organizationID = (
          payload as InAppNotificationPayloadOrganizationMessageRoom
        ).organizationID;
        break;

      case NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityInvitation;
        result.spaceID = typedPayload.spaceID;
        result.invitationID = typedPayload.invitationID;
        result.organizationID = typedPayload.organizationID;
        break;
      }

      case NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityActor;
        result.spaceID = typedPayload.spaceID;
        result.organizationID = typedPayload.actorID;
        break;
      }

      case NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_INVITATION_ACCEPTED:
      case NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_INVITATION_DECLINED:
      case NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_APPLICATION:
      case NotificationEvent.ORGANIZATION_ADMIN_ASSOCIATE_JOINED: {
        const typedPayload =
          payload as InAppNotificationPayloadOrganizationAssociateActor;
        result.organizationID = typedPayload.organizationID;
        result.contributorActorId = typedPayload.actorID;
        result.applicationID = typedPayload.applicationID;
        result.invitationID = typedPayload.invitationID;
        break;
      }

      // ========================================
      // SPACE NOTIFICATIONS
      // ========================================

      case NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityApplication
        ).spaceID;
        result.applicationID = (
          payload as InAppNotificationPayloadSpaceCommunityApplication
        ).applicationID;
        break;

      case NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityActor;
        result.spaceID = typedPayload.spaceID;
        result.contributorActorId = typedPayload.actorID;
        break;
      }

      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_FORM_RESPONSE: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCallout;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        break;
      }

      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCallout;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        result.contributionID = typedPayload.contributionID;
        break;
      }

      case NotificationEvent.SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityActor
        ).spaceID;
        result.contributorActorId = (
          payload as InAppNotificationPayloadSpaceCommunityActor
        ).actorID;
        break;

      case NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED:
      case NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_DECLINED: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityActor;
        result.spaceID = typedPayload.spaceID;
        // `contributorActorId`, NOT `organizationID` — matching the USER and
        // Virtual-Contributor siblings below. These are SPACE-admin
        // notifications about an organization; `organizationID` means "this
        // notification belongs to that organization's own feed", and
        // `removeActorFromRole` uses it to wipe a user's notifications when
        // they stop being an ASSOCIATE of that organization
        // (deleteAllForReceiverInOrganization). A Space admin who also happens
        // to be an associate of the invited organization would then lose this
        // Space-admin row the moment they left the organization — two
        // unrelated memberships, one delete. The Actor FK still cascades when
        // the organization itself is deleted, because an Organization IS an
        // Actor.
        result.contributorActorId = typedPayload.actorID;
        break;
      }

      case NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED:
      case NotificationEvent.SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityActor;
        result.spaceID = typedPayload.spaceID;
        result.contributorActorId = typedPayload.actorID;
        break;
      }

      case NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunicationMessageDirect
        ).spaceID;
        break;

      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunicationUpdate
        ).spaceID;
        result.messageID = (
          payload as InAppNotificationPayloadSpaceCommunicationUpdate
        ).messageID;
        break;

      case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityCalendarEvent
        ).spaceID;
        result.calendarEventID = (
          payload as InAppNotificationPayloadSpaceCommunityCalendarEvent
        ).calendarEventID;
        break;

      case NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCommunityCalendarEventComment;
        result.spaceID = typedPayload.spaceID;
        result.calendarEventID = typedPayload.calendarEventID;
        result.messageID = typedPayload.messageID;
        result.roomID = typedPayload.roomID;
        break;
      }

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCollaborationCallout
        ).spaceID;
        result.calloutID = (
          payload as InAppNotificationPayloadSpaceCollaborationCallout
        ).calloutID;
        break;

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCallout;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        result.contributionID = typedPayload.contributionID;
        break;
      }

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCalloutComment;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        result.messageID = typedPayload.messageID;
        result.roomID = typedPayload.roomID;
        break;
      }

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_REACTION: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCalloutReaction;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        break;
      }

      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationCalloutPostComment;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        result.contributionID = typedPayload.contributionID;
        result.messageID = typedPayload.messageID;
        result.roomID = typedPayload.roomID;
        break;
      }

      case NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL:
      case NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON:
      case NotificationEvent.SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON:
      case NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE: {
        const typedPayload =
          payload as InAppNotificationPayloadSpaceCollaborationPoll;
        result.spaceID = typedPayload.spaceID;
        result.calloutID = typedPayload.calloutID;
        result.pollID = typedPayload.pollID;
        break;
      }

      // this is not supported by the in-apps
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityInvitationPlatform
        ).spaceID;
        result.invitationID = (
          payload as InAppNotificationPayloadSpaceCommunityInvitationPlatform
        ).platformInvitationID;
        break;

      // ========================================
      // USER NOTIFICATIONS
      // ========================================

      case NotificationEvent.USER_SIGN_UP_WELCOME:
        result.userID = payload.userID;
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_INVITATION:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityInvitation
        ).spaceID;
        result.invitationID = (
          payload as InAppNotificationPayloadSpaceCommunityInvitation
        ).invitationID;
        break;

      case NotificationEvent.USER_SPACE_COMMUNITY_JOINED:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityActor
        ).spaceID;
        result.userID = (
          payload as InAppNotificationPayloadSpaceCommunityActor
        ).actorID;
        break;

      case NotificationEvent.USER_ORGANIZATION_ASSOCIATE_INVITATION: {
        const typedPayload =
          payload as InAppNotificationPayloadOrganizationAssociateInvitation;
        result.organizationID = typedPayload.organizationID;
        result.invitationID = typedPayload.invitationID;
        break;
      }

      case NotificationEvent.USER_ORGANIZATION_ASSOCIATE_APPLICATION_APPROVED:
      case NotificationEvent.USER_ORGANIZATION_ASSOCIATE_APPLICATION_DECLINED: {
        const typedPayload =
          payload as InAppNotificationPayloadOrganizationAssociateActor;
        result.organizationID = typedPayload.organizationID;
        result.applicationID = typedPayload.applicationID;
        break;
      }

      case NotificationEvent.USER_MESSAGE:
        result.userID = (
          payload as InAppNotificationPayloadUserMessageDirect
        ).userID;
        break;

      case NotificationEvent.USER_MENTIONED:
      case NotificationEvent.USER_COMMENT_REPLY: {
        const typedPayload = payload as InAppNotificationPayloadUserMessageRoom;
        result.userID = typedPayload.userID;
        result.messageID = typedPayload.messageID;
        result.roomID = typedPayload.roomID;
        break;
      }

      // ========================================
      // VIRTUAL CONTRIBUTOR NOTIFICATIONS
      // ========================================

      case NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION:
        result.spaceID = (
          payload as InAppNotificationPayloadVirtualContributor
        ).space.id;
        result.contributorActorId = (
          payload as InAppNotificationPayloadVirtualContributor
        ).virtualContributorID;
        break;

      default:
        // Unknown event type - log warning but don't throw
        this.logger.warn?.(`Unknown notification event type: ${eventType}`);
        break;
    }

    return result;
  }
}
