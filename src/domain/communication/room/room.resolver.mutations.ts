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
import { INameable } from '@domain/common/entity/nameable-entity';
import { IDiscussion } from '../discussion/discussion.interface';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/notification.dto.input.update.sent';
import { ActivityInputUpdateSent } from '@services/adapters/activity-adapter/dto/activity.dto.input.update.sent';

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

    const message = await this.roomService.sendMessage(
      room,
      agentInfo.communicationID,
      messageData
    );

    this.processMessageReceivedSubscription(room, message);

    switch (room.type) {
      case RoomType.POST:
        const post = await this.namingService.getPostForRoom(
          messageData.roomID
        );

        this.processNotificationMentions(post, room, message, agentInfo);
        this.processNotificationPostComment(post, room, message, agentInfo);
        this.processActivityPostComment(post, message, agentInfo);

        const community =
          await this.communityResolverService.getCommunityFromPostRoomOrFail(
            messageData.roomID
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
        break;
      case RoomType.CALENDAR_EVENT:
        const calendar = await this.namingService.getCalendarEventForRoom(
          messageData.roomID
        );

        this.processNotificationMentions(calendar, room, message, agentInfo);

        break;
      case RoomType.DISCUSSION:
        const discussion = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );

        this.processNotificationMentions(discussion, room, message, agentInfo);
        this.processNotificationForumDiscussionComment(
          discussion,
          message,
          agentInfo
        );

      case RoomType.UPDATES:
        this.processNotificationUpdateSent(room, agentInfo);
        this.processActivityUpdateSent(room, message, agentInfo);

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

      default:
      // ignore for now, later likely to be an exception
    }

    return message;
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
    description: 'Add a reaction to a message from the specified Room.',
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
    description: 'Remove a reaction on a message from the specified Room.',
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

  private processMessageReceivedSubscription(room: IRoom, message: IMessage) {
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

  private processNotificationMentions(
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

  private async processNotificationPostComment(
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

  private async processNotificationForumDiscussionComment(
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

  private async processActivityPostComment(
    post: IAspect,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputAspectComment = {
      triggeredBy: agentInfo.userID,
      aspect: post,
      message: message,
    };
    this.activityAdapter.aspectComment(activityLogInput);
  }

  private async processActivityUpdateSent(
    updates: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: updates,
      message: message,
    };
    this.activityAdapter.updateSent(activityLogInput);
  }

  private async processNotificationUpdateSent(
    updates: IRoom,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputUpdateSent = {
      triggeredBy: agentInfo.userID,
      updates: updates,
    };
    await this.notificationAdapter.updateSent(notificationInput);
  }
}
