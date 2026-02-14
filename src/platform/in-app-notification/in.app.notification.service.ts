import { LogContext } from '@common/enums';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  PaginatedInAppNotifications,
  PaginationArgs,
} from '@core/pagination';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { NotificationEventsFilterInput } from '@services/api/me/dto/me.notification.event.filter.dto.input';
import { and, count, desc, eq, gt, inArray, lt, ne, or } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { inAppNotifications } from './in.app.notification.schema';
import {
  InAppNotificationPayloadOrganizationMessageDirect,
  InAppNotificationPayloadOrganizationMessageRoom,
} from '../in-app-notification-payload/dto/organization';
import { InAppNotificationPayloadPlatformForumDiscussion } from '../in-app-notification-payload/dto/platform';
import {
  InAppNotificationPayloadSpace,
  InAppNotificationPayloadSpaceCollaborationCallout,
  InAppNotificationPayloadSpaceCollaborationCalloutComment,
  InAppNotificationPayloadSpaceCollaborationCalloutPostComment,
  InAppNotificationPayloadSpaceCommunicationMessageDirect,
  InAppNotificationPayloadSpaceCommunicationUpdate,
  InAppNotificationPayloadSpaceCommunityApplication,
  InAppNotificationPayloadSpaceCommunityCalendarEvent,
  InAppNotificationPayloadSpaceCommunityCalendarEventComment,
  InAppNotificationPayloadSpaceCommunityContributor,
  InAppNotificationPayloadSpaceCommunityInvitation,
  InAppNotificationPayloadSpaceCommunityInvitationPlatform,
} from '../in-app-notification-payload/dto/space';
import {
  InAppNotificationPayloadUser,
  InAppNotificationPayloadUserMessageDirect,
  InAppNotificationPayloadUserMessageRoom,
} from '../in-app-notification-payload/dto/user';
import { InAppNotificationPayloadVirtualContributor } from '../in-app-notification-payload/dto/virtual-contributor';
import { CreateInAppNotificationInput } from './dto/in.app.notification.create';
import { InAppNotificationCoreEntityIds } from './in.app.notification.core.entity.ids';
import { IInAppNotification } from './in.app.notification.interface';

@Injectable()
export class InAppNotificationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public createInAppNotification(
    inAppData: CreateInAppNotificationInput
  ): typeof inAppNotifications.$inferInsert {
    const coreEntityIds = this.extractCoreEntityIds(
      inAppData.type,
      inAppData.payload
    );

    return {
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
      calendarEventID: coreEntityIds.calendarEventID,
    };
  }

  public async getRawNotificationOrFail(
    ID: string
  ): Promise<typeof inAppNotifications.$inferSelect> {
    const notification = await this.db.query.inAppNotifications.findFirst({
      where: eq(inAppNotifications.id, ID),
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
    const conditions = [eq(inAppNotifications.receiverID, receiverID)];

    if (filter?.types && filter.types.length > 0) {
      conditions.push(inArray(inAppNotifications.type, filter.types));
    }

    return this.db.query.inAppNotifications.findMany({
      where: and(...conditions),
      orderBy: desc(inAppNotifications.triggeredAt),
    }) as unknown as Promise<IInAppNotification[]>;
  }

  public async getRawNotificationsUnreadCount(
    receiverID: string,
    filter?: NotificationEventsFilterInput
  ): Promise<number> {
    const conditions = [
      eq(inAppNotifications.receiverID, receiverID),
      eq(inAppNotifications.state, NotificationEventInAppState.UNREAD),
    ];

    if (filter?.types && filter.types.length > 0) {
      conditions.push(inArray(inAppNotifications.type, filter.types));
    }

    const result = await this.db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  public async getPaginatedNotifications(
    receiverID: string,
    paginationArgs: PaginationArgs,
    filter?: NotificationEventsFilterInput
  ): Promise<PaginatedInAppNotifications> {
    // Build base conditions
    const baseConditions = [
      eq(inAppNotifications.receiverID, receiverID),
      ne(inAppNotifications.state, NotificationEventInAppState.ARCHIVED),
    ];

    if (filter?.types && filter.types.length > 0) {
      baseConditions.push(inArray(inAppNotifications.type, filter.types));
    }

    const { first, after, last, before } = paginationArgs;
    const limit = first ?? last ?? 25;

    // Build cursor conditions if needed
    const cursorConditions = [...baseConditions];

    if (after) {
      const afterNotification =
        await this.db.query.inAppNotifications.findFirst({
          where: eq(inAppNotifications.id, after),
          columns: { id: true, triggeredAt: true },
        });
      if (afterNotification) {
        cursorConditions.push(
          or(
            lt(inAppNotifications.triggeredAt, afterNotification.triggeredAt),
            and(
              eq(inAppNotifications.triggeredAt, afterNotification.triggeredAt),
              lt(inAppNotifications.id, afterNotification.id)
            )
          )!
        );
      }
    }

    if (before) {
      const beforeNotification =
        await this.db.query.inAppNotifications.findFirst({
          where: eq(inAppNotifications.id, before),
          columns: { id: true, triggeredAt: true },
        });
      if (beforeNotification) {
        cursorConditions.push(
          or(
            gt(inAppNotifications.triggeredAt, beforeNotification.triggeredAt),
            and(
              eq(
                inAppNotifications.triggeredAt,
                beforeNotification.triggeredAt
              ),
              gt(inAppNotifications.id, beforeNotification.id)
            )
          )!
        );
      }
    }

    // Fetch one extra to determine hasNextPage
    const items = await this.db.query.inAppNotifications.findMany({
      where: and(...cursorConditions),
      orderBy: [
        desc(inAppNotifications.triggeredAt),
        desc(inAppNotifications.id),
      ],
      limit: limit + 1,
    });

    const hasNextPage = items.length > limit;
    const hasPreviousPage = !!after || !!before;
    const actualItems = hasNextPage ? items.slice(0, limit) : items;

    // Get total count with base conditions (without cursor)
    const totalResult = await this.db
      .select({ count: count() })
      .from(inAppNotifications)
      .where(and(...baseConditions));
    const total = totalResult[0]?.count ?? 0;

    return {
      total,
      items: actualItems as unknown as IInAppNotification[],
      pageInfo: {
        startCursor: actualItems[0]?.id ?? undefined,
        endCursor: actualItems[actualItems.length - 1]?.id ?? undefined,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  public async updateNotificationState(
    ID: string,
    state: NotificationEventInAppState
  ): Promise<NotificationEventInAppState> {
    // Verify the notification exists
    await this.getRawNotificationOrFail(ID);

    const [updated] = await this.db
      .update(inAppNotifications)
      .set({ state })
      .where(eq(inAppNotifications.id, ID))
      .returning({ state: inAppNotifications.state });

    return updated.state as NotificationEventInAppState;
  }

  async bulkUpdateNotificationStateByTypes(
    userId: string,
    state: NotificationEventInAppState,
    filter?: NotificationEventsFilterInput
  ): Promise<{ affected: number }> {
    const conditions = [
      eq(inAppNotifications.receiverID, userId),
      ne(inAppNotifications.state, NotificationEventInAppState.ARCHIVED),
    ];

    // If filter is provided with specific types, only update those types
    // If no filter is provided, update all notifications
    if (filter?.types && filter.types.length > 0) {
      conditions.push(inArray(inAppNotifications.type, filter.types));
    }

    const result = await this.db
      .update(inAppNotifications)
      .set({ state })
      .where(and(...conditions));

    return { affected: Array.from(result).length };
  }

  public async saveInAppNotifications(
    entities: (typeof inAppNotifications.$inferInsert)[]
  ): Promise<(typeof inAppNotifications.$inferSelect)[]> {
    if (entities.length === 0) {
      return [];
    }

    return this.db
      .insert(inAppNotifications)
      .values(entities)
      .returning();
  }

  public async deleteAllByMessageId(messageID: string): Promise<void> {
    await this.db
      .delete(inAppNotifications)
      .where(eq(inAppNotifications.messageID, messageID));
  }

  public async deleteAllForReceiverInSpace(
    receiverID: string,
    spaceID: string
  ): Promise<void> {
    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.receiverID, receiverID),
          eq(inAppNotifications.spaceID, spaceID)
        )
      );
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

    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.receiverID, receiverID),
          inArray(inAppNotifications.spaceID, spaceIDs)
        )
      );
  }

  public async deleteAllForReceiverInOrganization(
    receiverID: string,
    organizationID: string
  ): Promise<void> {
    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.receiverID, receiverID),
          eq(inAppNotifications.organizationID, organizationID)
        )
      );
  }

  public async deleteAllForContributorVcInSpace(
    contributorVcID: string,
    spaceID: string
  ): Promise<void> {
    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.contributorVcID, contributorVcID),
          eq(inAppNotifications.spaceID, spaceID)
        )
      );
  }

  /**
   * Deletes all notifications for a Virtual Contributor in multiple spaces.
   * This is used when a VC is removed from a parent space to clean up
   * notifications from all child spaces (L1, L2, etc.).
   * @param contributorVcID The Virtual Contributor ID
   * @param spaceIDs Array of space IDs
   */
  public async deleteAllForContributorVcInSpaces(
    contributorVcID: string,
    spaceIDs: string[]
  ): Promise<void> {
    if (spaceIDs.length === 0) {
      return;
    }

    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.contributorVcID, contributorVcID),
          inArray(inAppNotifications.spaceID, spaceIDs)
        )
      );
  }

  public async deleteAllForContributorOrganizationInSpace(
    contributorOrganizationID: string,
    spaceID: string
  ): Promise<void> {
    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(
            inAppNotifications.contributorOrganizationID,
            contributorOrganizationID
          ),
          eq(inAppNotifications.spaceID, spaceID)
        )
      );
  }

  /**
   * Deletes all notifications for an Organization in multiple spaces.
   * This is used when an Organization is removed from a parent space to clean up
   * notifications from all child spaces (L1, L2, etc.).
   * @param contributorOrganizationID The Organization ID
   * @param spaceIDs Array of space IDs
   */
  public async deleteAllForContributorOrganizationInSpaces(
    contributorOrganizationID: string,
    spaceIDs: string[]
  ): Promise<void> {
    if (spaceIDs.length === 0) {
      return;
    }

    await this.db
      .delete(inAppNotifications)
      .where(
        and(
          eq(
            inAppNotifications.contributorOrganizationID,
            contributorOrganizationID
          ),
          inArray(inAppNotifications.spaceID, spaceIDs)
        )
      );
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
          payload as InAppNotificationPayloadSpaceCommunityContributor;
        result.spaceID = typedPayload.spaceID;
        // contributor FKs
        result.contributorOrganizationID =
          typedPayload.contributorType === RoleSetContributorType.ORGANIZATION
            ? typedPayload.contributorID
            : undefined;
        result.contributorUserID =
          typedPayload.contributorType === RoleSetContributorType.USER
            ? typedPayload.contributorID
            : undefined;
        result.contributorVcID =
          typedPayload.contributorType === RoleSetContributorType.VIRTUAL
            ? typedPayload.contributorID
            : undefined;

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

      case NotificationEvent.SPACE_ADMIN_VIRTUAL_CONTRIBUTOR_COMMUNITY_INVITATION_DECLINED:
        result.spaceID = (
          payload as InAppNotificationPayloadSpaceCommunityContributor
        ).spaceID;
        result.contributorVcID = (
          payload as InAppNotificationPayloadSpaceCommunityContributor
        ).contributorID;
        break;

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
          payload as InAppNotificationPayloadSpaceCommunityContributor
        ).spaceID;
        result.userID = (
          payload as InAppNotificationPayloadSpaceCommunityContributor
        ).contributorID;
        break;

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

      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION:
        result.spaceID = (
          payload as InAppNotificationPayloadVirtualContributor
        ).space.id;
        result.contributorVcID = (
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
