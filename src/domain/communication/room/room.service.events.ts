import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '../message/message.interface';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPostComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.comment';
import { IPost } from '@domain/collaboration/post/post.interface';
import { IRoom } from './room.interface';
import { NotificationInputPlatformForumDiscussionComment } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { IDiscussion } from '../../../platform/forum-discussion/discussion.interface';
import { ActivityInputUpdateSent } from '@services/adapters/activity-adapter/dto/activity.dto.input.update.sent';
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputCommentReply } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.update.sent';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { NotificationInputCollaborationCalloutPostContributionComment } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.post.contribution.comment';
import { NotificationInputCollaborationCalloutComment } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.comment';
import { NotificationInputCommunityCalendarEventComment } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.comment';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { LogContext } from '@common/enums/logging.context';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';

/**
 * FIXME: Activity, Contribution, and Notification Tracking Limited to Users Only
 *
 * Current Limitation:
 * The activity, contribution tracking, and notification systems only support User IDs,
 * not Contributor IDs. When a VirtualContributor (VC) or Organization triggers an action,
 * agentInfo.userID is empty ('') because AgentInfoService.buildAgentInfoForAgent()
 * returns anonymous AgentInfo for non-user agents (see agent.info.service.ts:264-269).
 *
 * Technical Details:
 * - activity.triggeredBy database column expects User UUID (uuid NOT NULL)
 * - Activity types (IActivityLogEntry, IActivityLogEntryBase) define triggeredBy: IUser
 * - Notification payloads (BaseEventPayload) expect triggeredBy to be User ID
 * - ContributionReporter expects user.id and user.email fields
 * - Empty string ('') fails PostgreSQL UUID validation for activities
 * - Empty string ('') causes UserService.getUserOrFail() to throw for notifications
 *
 * Current Workaround:
 * Methods in this service guard activity/contribution/notification tracking with
 * `if (agentInfo.userID)` checks, silently skipping tracking for non-user agents
 * (VCs, Organizations). Debug logs are emitted when tracking is skipped.
 *
 * Impact:
 * ✅ Prevents database errors for VC/Org actions
 * ✅ Preserves existing behavior for User actions
 * ✅ Observable via DEBUG logs
 * ❌ No activity log entries for VC/Org actions
 * ❌ No contribution metrics for VC/Org actions
 * ❌ No notifications sent for VC/Org actions
 * ❌ Analytics incomplete for non-user contributors
 *
 * Proper Fix Requires:
 * 1. Update activity.triggeredBy column to accept any Contributor UUID (or add discriminator)
 * 2. Change IActivityLogEntry.triggeredBy from IUser to IContributor
 * 3. Update IActivityLogEntryBase.triggeredBy from IUser to IContributor
 * 4. Update ActivityLogService to use ContributorLookupService instead of UserService
 * 5. Update BaseEventPayload.triggeredBy to use ContributorPayload instead of UserPayload
 * 6. Update NotificationExternalAdapter.buildBaseEventPayload to use getContributorPayloadOrFail
 * 7. Update activity log display logic to handle polymorphic contributor types
 * 8. Update ContributionReporter to accept Contributor payloads instead of User-only
 * 9. Add GraphQL schema versioning if needed for breaking changes
 *
 * Related Files:
 * - src/core/authentication.agent.info/agent.info.service.ts (buildAgentInfoForAgent)
 * - src/services/api/activity-log/activity.log.service.ts (getUserOrFail)
 * - src/services/api/activity-log/dto/activity.log.dto.entry.base.interface.ts
 * - src/services/api/activity-log/dto/activity.log.entry.interface.ts
 * - src/platform/activity/activity.entity.ts (triggeredBy column)
 * - src/services/external/elasticsearch/contribution-reporter (user-specific tracking)
 * - src/services/adapters/notification-external-adapter/notification.external.adapter.ts
 */

@Injectable()
export class RoomServiceEvents {
  constructor(
    private activityAdapter: ActivityAdapter,
    private contributionReporter: ContributionReporterService,
    private notificationSpaceAdapter: NotificationSpaceAdapter,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private notificationUserAdapter: NotificationUserAdapter,
    private communityResolverService: CommunityResolverService,
    private timelineResolverService: TimelineResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async processNotificationCommentReply(
    room: IRoom,
    reply: IMessage,
    agentInfo: AgentInfo,
    messageOwnerId: string
  ) {
    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for comment reply: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Send the notification
    const notificationInput: NotificationInputCommentReply = {
      triggeredBy: agentInfo.userID,
      roomId: room.id,
      messageRepliedToOwnerID: messageOwnerId,
      messageID: reply.id,
    };
    await this.notificationUserAdapter.userCommentReply(notificationInput);
  }

  public async processNotificationCalloutComment(
    callout: ICallout,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo,
    mentionedUserIDs?: string[]
  ) {
    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for callout comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Send the notification
    const notificationInput: NotificationInputCollaborationCalloutComment = {
      triggeredBy: agentInfo.userID,
      callout,
      comments: room,
      commentSent: message,
      mentionedUserIDs,
    };
    await this.notificationSpaceAdapter.spaceCollaborationCalloutComment(
      notificationInput
    );
  }

  public async processNotificationPostContributionComment(
    callout: ICallout,
    post: IPost,
    contribution: ICalloutContribution,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo,
    mentionedUserIDs?: string[]
  ) {
    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for post contribution comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Send the notification
    const notificationInput: NotificationInputCollaborationCalloutPostContributionComment =
      {
        triggeredBy: agentInfo.userID,
        post,
        callout,
        contribution,
        room,
        commentSent: message,
        mentionedUserIDs,
      };
    await this.notificationSpaceAdapter.spaceCollaborationCalloutPostContributionComment(
      notificationInput
    );
  }

  public async processNotificationForumDiscussionComment(
    discussion: IDiscussion,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for forum discussion comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    const forumDiscussionCommentNotificationInput: NotificationInputPlatformForumDiscussionComment =
      {
        triggeredBy: agentInfo.userID,
        discussion,
        commentSent: message,
        userID: discussion.createdBy,
      };
    this.notificationPlatformAdapter.platformForumDiscussionComment(
      forumDiscussionCommentNotificationInput
    );
  }

  public async processNotificationCalendarEventComment(
    calendarEvent: ICalendarEvent,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // Get space ID from calendar event's calendar
    if (!calendarEvent.calendar?.id) {
      this.logger.warn?.(
        `Calendar event ${calendarEvent.id} has no associated calendar - skipping notification`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    const spaceID = await this.timelineResolverService.getSpaceIdForCalendar(
      calendarEvent.calendar.id
    );

    if (!spaceID) {
      this.logger.warn?.(
        `Unable to determine space for calendar ${calendarEvent.calendar.id} - skipping notification`,
        LogContext.NOTIFICATIONS
      );
      return;
    }

    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for calendar event comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    // Send the notification
    const notificationInput: NotificationInputCommunityCalendarEventComment = {
      triggeredBy: agentInfo.userID,
      calendarEvent,
      comments: room,
      commentSent: message,
    };

    await this.notificationSpaceAdapter.spaceCommunityCalendarEventComment(
      notificationInput,
      spaceID
    );
  }

  public async processActivityPostComment(
    post: IPost,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // FIXME: Activity system only tracks User IDs - see file-level comment for details
    if (agentInfo.userID) {
      const activityLogInput: ActivityInputCalloutPostComment = {
        triggeredBy: agentInfo.userID,
        post: post,
        message: message,
      };
      this.activityAdapter.calloutPostComment(activityLogInput);
    } else {
      this.logger.debug?.(
        `Skipping activity creation for post comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        room.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );

    // FIXME: Contribution reporter only tracks User IDs - see file-level comment
    if (agentInfo.userID) {
      this.contributionReporter.calloutPostCommentCreated(
        {
          id: post.id,
          name: post.profile.displayName,
          space: levelZeroSpaceID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    } else {
      this.logger.debug?.(
        `Skipping contribution reporting for post comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async processActivityMessageRemoved(
    messageID: string,
    agentInfo: AgentInfo
  ) {
    // FIXME: Activity system only tracks User IDs - see file-level comment for details
    if (agentInfo.userID) {
      const activityMessageRemoved: ActivityInputMessageRemoved = {
        triggeredBy: agentInfo.userID,
        messageID: messageID,
      };
      await this.activityAdapter.messageRemoved(activityMessageRemoved);
    } else {
      this.logger.debug?.(
        `Skipping activity creation for message removal: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async processActivityUpdateSent(
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // FIXME: Activity system only tracks User IDs - see file-level comment for details
    if (agentInfo.userID) {
      const activityLogInput: ActivityInputUpdateSent = {
        triggeredBy: agentInfo.userID,
        updates: room,
        message: message,
      };
      this.activityAdapter.updateSent(activityLogInput);
    } else {
      this.logger.debug?.(
        `Skipping activity creation for update sent: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        room.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );

    // FIXME: Contribution reporter only tracks User IDs - see file-level comment
    if (agentInfo.userID) {
      this.contributionReporter.updateCreated(
        {
          id: room.id,
          name: '',
          space: levelZeroSpaceID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    } else {
      this.logger.debug?.(
        `Skipping contribution reporting for update: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }
  }

  public async processNotificationUpdateSent(
    updates: IRoom,
    lastMessage: IMessage,
    agentInfo: AgentInfo
  ) {
    // FIXME: Notification system only tracks User IDs - see file-level comment for details
    if (!agentInfo.userID) {
      this.logger.debug?.(
        `Skipping notification for update sent: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
      return;
    }

    const notificationInput: NotificationInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: updates,
      lastMessage: lastMessage,
    };
    await this.notificationSpaceAdapter.spaceCommunicationUpdate(
      notificationInput
    );
  }

  public async processActivityCalloutCommentCreated(
    callout: ICallout,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // FIXME: Activity system only tracks User IDs - see file-level comment for details
    if (agentInfo.userID) {
      const activityLogInput: ActivityInputCalloutDiscussionComment = {
        triggeredBy: agentInfo.userID,
        callout: callout,
        message,
      };
      this.activityAdapter.calloutCommentCreated(activityLogInput);
    } else {
      this.logger.debug?.(
        `Skipping activity creation for callout comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );

    // FIXME: Contribution reporter only tracks User IDs - see file-level comment
    if (agentInfo.userID) {
      this.contributionReporter.calloutCommentCreated(
        {
          id: callout.id,
          name: callout.nameID,
          space: levelZeroSpaceID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    } else {
      this.logger.debug?.(
        `Skipping contribution reporting for callout comment: agentInfo.userID is empty (agent: ${agentInfo.agentID})`,
        LogContext.COMMUNICATION
      );
    }
  }
}
