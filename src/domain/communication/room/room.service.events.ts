import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
import { IMessage } from '../message/message.interface';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.comment';
import { NotificationInputAspectComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.comment';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { RoomType } from '@common/enums/room.type';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';
import { IRoom } from './room.interface';
import { NotificationInputForumDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.forum.discussion.comment';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IDiscussion } from '../discussion/discussion.interface';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/notification.dto.input.update.sent';
import { ActivityInputUpdateSent } from '@services/adapters/activity-adapter/dto/activity.dto.input.update.sent';
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ElasticsearchService } from '@services/external/elasticsearch/elasticsearch.service';
import { NotificationInputDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.discussion.comment';
import { ICallout } from '@domain/collaboration/callout';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { NotificationInputCommentReply } from '@services/adapters/notification-adapter/dto/notification.dto.input.comment.reply';

@Injectable()
export class RoomServiceEvents {
  constructor(
    private activityAdapter: ActivityAdapter,
    private elasticService: ElasticsearchService,
    private notificationAdapter: NotificationAdapter,
    private communityResolverService: CommunityResolverService
  ) {}

  public processNotificationMentions(
    parentEntity: INameable,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const mentions = getMentionsFromText(message.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: message.message,
      roomId: room.id,
      mentions,
      originEntity: {
        id: parentEntity.id,
        nameId: parentEntity.nameID,
        displayName: parentEntity.profile.displayName,
      },
      commentType: room.type as RoomType,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }

  public async processNotificationCommentReply(
    parentEntity: INameable,
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
        id: parentEntity.id,
        nameId: parentEntity.nameID,
        displayName: parentEntity.profile.displayName,
      },
      commentType: room.type as RoomType,
    };
    await this.notificationAdapter.commentReply(notificationInput);
  }

  public async processNotificationPostComment(
    aspect: IAspect,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputAspectComment = {
      triggeredBy: agentInfo.userID,
      aspect: aspect,
      room: room,
      commentSent: message,
    };
    await this.notificationAdapter.aspectComment(notificationInput);
  }

  public async processNotificationForumDiscussionComment(
    discussion: IDiscussion,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const forumDiscussionCommentNotificationInput: NotificationInputForumDiscussionComment =
      {
        triggeredBy: agentInfo.userID,
        discussion,
        commentSent: message,
      };
    this.notificationAdapter.forumDiscussionComment(
      forumDiscussionCommentNotificationInput
    );
  }

  public async processActivityPostComment(
    post: IAspect,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputAspectComment = {
      triggeredBy: agentInfo.userID,
      aspect: post,
      message: message,
    };
    this.activityAdapter.aspectComment(activityLogInput);

    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        room.id
      );
    this.elasticService.calloutPostCommentCreated(
      {
        id: post.id,
        name: post.profile.displayName,
        hub: community.hubID,
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

    const { hubID } =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        room.id
      );

    this.elasticService.updateCreated(
      {
        id: room.id,
        name: '',
        hub: hubID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }

  public async processNotificationUpdateSent(
    updates: IRoom,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: updates,
    };
    await this.notificationAdapter.updateSent(notificationInput);
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

    const { hubID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.elasticService.calloutCommentCreated(
      {
        id: callout.id,
        name: callout.nameID,
        hub: hubID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }

  public async processNotificationDiscussionComment(
    callout: ICallout,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputDiscussionComment = {
      callout: callout,
      triggeredBy: agentInfo.userID,
      comments: room,
      commentSent: message,
    };
    await this.notificationAdapter.discussionComment(notificationInput);
  }
}
