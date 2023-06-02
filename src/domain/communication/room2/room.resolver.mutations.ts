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
import { SUBSCRIPTION_ASPECT_COMMENT } from '@common/constants/providers';
import { RoomAuthorizationService } from './room.service.authorization';
import { IRoom } from './room.interface';
import { getRandomId } from '@src/common/utils';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.comment';
import { AspectMessageReceivedPayload } from '@domain/collaboration/aspect/dto/aspect.message.received.payload';
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
import { CalendarEventCommentsMessageReceived as CalendarEventRoomMessageReceived } from '@domain/timeline/event/dto/event.dto.event.message.received';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';

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
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private readonly subscriptionAspectRoom: PubSubEngine
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

    const commentSent = await this.roomService.sendMessage(
      room,
      agentInfo.communicationID,
      messageData
    );

    switch (room.type) {
      case RoomType.POST:
        const post = await this.namingService.getPostForRoom(
          messageData.roomID
        );
        if (!post) {
          throw new EntityNotFoundException(
            `Unable to identify Post for Room: invalid global role encountered: ${room.id}`,
            LogContext.COLLABORATION
          );
        }
        this.processRoomEventsOnPost(post, room, commentSent, agentInfo);
        const activityLogInput: ActivityInputAspectComment = {
          triggeredBy: agentInfo.userID,
          aspect: post,
          message: commentSent,
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
        const calendar = await this.namingService.getCalendarEventForRoom(
          messageData.roomID
        );
        if (calendar) {
          this.processRoomEventsOnCalendarEvent(
            calendar,
            room,
            commentSent,
            agentInfo
          );
        }
        break;
      default:
      // ignore for now, later likely to be an exception
    }

    return commentSent;
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
    // build subscription payload
    const eventID = `comment-msg-${getRandomId()}`;
    const subscriptionPayload: AspectMessageReceivedPayload = {
      eventID: eventID,
      message: commentSent,
      aspectID: aspect.id,
    };
    // send the subscriptions event
    this.subscriptionAspectRoom.publish(
      SubscriptionType.ASPECT_COMMENTS_MESSAGE_RECEIVED,
      subscriptionPayload
    );

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

  private processRoomEventsOnCalendarEvent(
    calendarEvent: ICalendarEvent,
    room: IRoom,
    commentSent: IMessage,
    agentInfo: AgentInfo
  ) {
    // build subscription payload
    const eventID = `comment-msg-${getRandomId()}`;
    const subscriptionPayload: CalendarEventRoomMessageReceived = {
      eventID: eventID,
      message: commentSent,
      calendarEventID: calendarEvent.id,
    };
    // send the subscriptions event
    this.subscriptionAspectRoom.publish(
      SubscriptionType.CALENDAR_EVENT_COMMENTS_MESSAGE_RECEIVED,
      subscriptionPayload
    );

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
