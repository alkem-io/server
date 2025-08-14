import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '../message/message.interface';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPostComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.comment';
import { IPost } from '@domain/collaboration/post/post.interface';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from './room.interface';
import { NotificationInputPlatformForumDiscussionComment } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.forum.discussion.comment';
import { IDiscussion } from '../../../platform/forum-discussion/discussion.interface';
import { ActivityInputUpdateSent } from '@services/adapters/activity-adapter/dto/activity.dto.input.update.sent';
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { IProfile } from '@domain/common/profile';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputCommentReply } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.user.comment.reply';
import { NotificationInputPostComment } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.post.comment';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.communication.update.sent';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';

@Injectable()
export class RoomServiceEvents {
  constructor(
    private activityAdapter: ActivityAdapter,
    private contributionReporter: ContributionReporterService,
    private notificationSpaceAdapter: NotificationSpaceAdapter,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private notificationAdapter: NotificationAdapter,
    private communityResolverService: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async processNotificationCommentReply(
    parentEntityId: string,
    parentEntityNameId: string,
    parentEntityProfile: IProfile,
    room: IRoom,
    reply: IMessage,
    agentInfo: AgentInfo,
    messageOwnerId: string
  ) {
    // Send the notification
    const notificationInput: NotificationInputCommentReply = {
      triggeredBy: agentInfo.userID,
      reply: reply.message,
      roomId: room.id,
      commentOwnerID: messageOwnerId,
      originEntity: {
        id: parentEntityId,
        nameId: parentEntityNameId,
        displayName: parentEntityProfile.displayName,
      },
      commentType: room.type as RoomType,
    };
    await this.notificationAdapter.userCommentReply(notificationInput);
  }

  public async processNotificationPostComment(
    post: IPost,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputPostComment = {
      triggeredBy: agentInfo.userID,
      post: post,
      room: room,
      commentSent: message,
    };
    await this.notificationSpaceAdapter.spaceCollaborationPostComment(
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
      };
    this.notificationPlatformAdapter.platformForumDiscussionComment(
      forumDiscussionCommentNotificationInput
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
    await this.notificationSpaceAdapter.spaceCommunicationUpdateSent(
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
