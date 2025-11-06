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
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputCollaborationCalloutComment = {
      triggeredBy: agentInfo.userID,
      callout,
      comments: room,
      commentSent: message,
    };
    await this.notificationSpaceAdapter.spaceCollaborationCalloutComment(
      notificationInput
    );
  }

  public async processNotificationPostContributionComment(
    callout: ICallout,
    post: IPost,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputCollaborationCalloutPostContributionComment =
      {
        triggeredBy: agentInfo.userID,
        post,
        callout,
        room,
        commentSent: message,
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
    const activityLogInput: ActivityInputCalloutPostComment = {
      triggeredBy: agentInfo.userID,
      post: post,
      message: message,
    };
    this.activityAdapter.calloutPostComment(activityLogInput);

    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        room.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );
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
  }

  public async processActivityMessageRemoved(
    messageID: string,
    agentInfo: AgentInfo
  ) {
    const activityMessageRemoved: ActivityInputMessageRemoved = {
      triggeredBy: agentInfo.userID,
      messageID: messageID,
    };
    await this.activityAdapter.messageRemoved(activityMessageRemoved);
  }

  public async processActivityUpdateSent(
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: room,
      message: message,
    };
    this.activityAdapter.updateSent(activityLogInput);

    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        room.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );

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
  }

  public async processNotificationUpdateSent(
    updates: IRoom,
    lastMessage: IMessage,
    agentInfo: AgentInfo
  ) {
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
    const activityLogInput: ActivityInputCalloutDiscussionComment = {
      triggeredBy: agentInfo.userID,
      callout: callout,
      message,
    };
    this.activityAdapter.calloutCommentCreated(activityLogInput);

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );

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
  }
}
