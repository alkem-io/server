import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoomService } from './room.service';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { MessageID } from '@domain/common/scalars';
import { IMessage } from '../message/message.interface';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { RoomAuthorizationService } from './room.service.authorization';
import { getRandomId } from '@src/common/utils';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.comment';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { NotificationInputAspectComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.comment';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { RoomType } from '@common/enums/room.type';
import { ICalendarEvent } from '@domain/timeline/event';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { IRoom } from './room.interface';
import { SUBSCRIPTION_ROOM_MESSAGE } from '@common/constants';
import { RoomMessageReceived } from './dto/room.subscription.dto.event.message.received';
import { NotificationInputForumDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.forum.discussion.comment';

@Resolver()
export class RoomResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private elasticService: ElasticsearchService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private namingService: NamingService,
    private roomAuthorizationService: RoomAuthorizationService,
    @Inject(SUBSCRIPTION_ROOM_MESSAGE)
    private readonly subscriptionRoomMessage: PubSubEngine
  ) {}

  // todo should be removed to serve per entity e.g. send aspect comment
  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  @Profiling.api
  async sendMessageToRoom(
    @Args('messageData') messageData: RoomSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `room send message: ${room.id}`
    );

    const messageSent = await this.roomService.sendMessage(
      room,
      agentInfo.communicationID,
      messageData
    );

    switch (room.type) {
      case RoomType.POST:
        this.sendRoomSubscriptionMessageReceivedEvent(room, messageSent);
        const post = await this.namingService.getPostForRoom(
          messageData.roomID
        );
        this.processRoomEventsOnPost(post, room, messageSent, agentInfo);
        const activityLogInput: ActivityInputAspectComment = {
          triggeredBy: agentInfo.userID,
          aspect: post,
          message: messageSent,
        };
        this.activityAdapter.aspectComment(activityLogInput);

        const { hubID } =
          await this.communityResolverService.getCommunityFromPostRoomOrFail(
            messageData.roomID
          );

        this.elasticService.calloutPostCommentCreated(
          {
            id: post.id,
            name: post.profile.displayName,
            hub: hubID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      case RoomType.CALENDAR_EVENT:
        this.sendRoomSubscriptionMessageReceivedEvent(room, messageSent);
        const calendar = await this.namingService.getCalendarEventForRoom(
          messageData.roomID
        );
        this.processRoomEventsOnCalendarEvent(
          calendar,
          room,
          messageSent,
          agentInfo
        );

        break;
      case RoomType.DISCUSSION:
        this.sendRoomSubscriptionMessageReceivedEvent(room, messageSent);
        const discussion = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );

        // const eventID2 = `discussion-update-${getRandomId()}`;
        // const subscriptionPayloadUpdate: CommunicationDiscussionUpdated = {
        //   eventID: eventID2,
        //   discussionID: discussion.id,
        // };
        // this.subscriptionDiscussionMessage.publish(
        //   SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
        //   subscriptionPayloadUpdate
        // );

        const mentions = getMentionsFromText(messageSent.message);
        const entityMentionsNotificationInput: NotificationInputEntityMentions =
          {
            triggeredBy: agentInfo.userID,
            comment: messageSent.message,
            roomId: room.id,
            mentions,
            originEntity: {
              id: room.id,
              nameId: discussion.nameID,
              displayName: discussion.profile.displayName,
            },
            commentType: RoomType.FORUM_DISCUSSION,
          };
        this.notificationAdapter.entityMentions(
          entityMentionsNotificationInput
        );

        const forumDiscussionCommentNotificationInput: NotificationInputForumDiscussionComment =
          {
            triggeredBy: agentInfo.userID,
            discussion,
            commentSent: messageSent,
          };
        this.notificationAdapter.forumDiscussionComment(
          forumDiscussionCommentNotificationInput
        );
      default:
      // ignore for now, later likely to be an exception
    }

    return messageSent;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => MessageID, {
    description: 'Removes a message.',
  })
  @Profiling.api
  async removeMessageOnRoom(
    @Args('messageData') messageData: RoomRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the message in question to remove the message by
    // extending the authorization policy in memory but do not persist it.
    const extendedAuthorization =
      await this.roomAuthorizationService.extendAuthorizationPolicyForMessageSender(
        room,
        messageData.messageID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove message: ${room.id}`
    );
    const messageID = await this.roomService.removeRoomMessage(
      room,
      agentInfo.communicationID,
      messageData
    );
    const activityMessageRemoved: ActivityInputMessageRemoved = {
      triggeredBy: agentInfo.userID,
      messageID: messageID,
    };
    await this.activityAdapter.messageRemoved(activityMessageRemoved);
    return messageID;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Room.',
  })
  @Profiling.api
  async sendMessageReplyToRoom(
    @Args('messageData') messageData: RoomSendMessageReplyInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);
    const message = await this.roomService.sendMessageReply(
      room,
      agentInfo.communicationID,
      messageData
    );

    return message;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Add a reaction to a message from the specified Room. ',
  })
  @Profiling.api
  async addReactionToMessageInRoom(
    @Args('messageData') messageData: RoomAddReactionToMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);
    const message = await this.roomService.addReactionToMessage(
      room,
      agentInfo.communicationID,
      messageData
    );

    return message;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Remove a reaction on a message from the specified Room. ',
  })
  @Profiling.api
  async removeReactionToMessageInRoom(
    @Args('messageData') messageData: RoomRemoveReactionToMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);
    return await this.roomService.removeReactionToMessage(
      room,
      agentInfo.communicationID,
      messageData
    );
  }

  private async processRoomEventsOnPost(
    aspect: IAspect,
    room: IRoom,
    commentSent: IMessage,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputAspectComment = {
      triggeredBy: agentInfo.userID,
      aspect: aspect,
      room: room,
      commentSent: commentSent,
    };
    await this.notificationAdapter.aspectComment(notificationInput);

    const mentions = getMentionsFromText(commentSent.message);

    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: commentSent.message,
      roomId: room.id,
      mentions,
      originEntity: {
        id: aspect.id,
        nameId: aspect.nameID,
        displayName: aspect.profile.displayName,
      },
      commentType: room.type as RoomType,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }

  private sendRoomSubscriptionMessageReceivedEvent(
    room: IRoom,
    message: IMessage
  ) {
    // build subscription payload
    const eventID = `room-msg-${getRandomId()}`;
    const subscriptionPayload: RoomMessageReceived = {
      eventID: eventID,
      message: message,
      roomID: room.id,
    };
    // send the subscriptions event
    this.subscriptionRoomMessage.publish(
      SubscriptionType.COMMUNICATION_ROOM_MESSAGE_RECEIVED,
      subscriptionPayload
    );
  }

  private processRoomEventsOnCalendarEvent(
    calendarEvent: ICalendarEvent,
    room: IRoom,
    commentSent: IMessage,
    agentInfo: AgentInfo
  ) {
    const mentions = getMentionsFromText(commentSent.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: commentSent.message,
      roomId: room.id,
      mentions,
      originEntity: {
        id: calendarEvent.id,
        nameId: calendarEvent.nameID,
        displayName: calendarEvent.profile.displayName,
      },
      commentType: RoomType.CALENDAR_EVENT,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
  }
}
