import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoomService } from './room.service';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { MessageID } from '@domain/common/scalars';
import { IMessage } from '../message/message.interface';
import { RoomAuthorizationService } from './room.service.authorization';
import { RoomType } from '@common/enums/room.type';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { LogContext } from '@common/enums/logging.context';
import { RoomServiceEvents } from './room.service.events';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MutationType } from '@common/enums/subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Mention } from '../messaging/mention.interface';
import { IRoom } from './room.interface';
import { RoomMentionsService } from '../room-mentions/room.mentions.service';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { ConversationMembershipService } from '../conversation-membership/conversation.membership.service';

@InstrumentResolver()
@Resolver()
export class RoomResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private roomResolverService: RoomResolverService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roomServiceEvents: RoomServiceEvents,
    private roomLookupService: RoomLookupService,
    private roomMentionsService: RoomMentionsService,
    private subscriptionPublishService: SubscriptionPublishService,
    private inAppNotificationService: InAppNotificationService,
    private userLookupService: UserLookupService,
    private communicationAdapter: CommunicationAdapter,
    private conversationMembershipService: ConversationMembershipService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IMessage, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  async sendMessageToRoom(
    @Args('messageData') messageData: RoomSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID, {
      relations: { authorization: true },
    });

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE,
      `room send message: ${room.id}`
    );

    await this.validateMessageOnCalloutOrFail(room);
    await this.validateMessageOnDirectConversationOrFail(room, agentInfo);

    const mentions = await this.roomMentionsService.getMentionsFromText(
      messageData.message
    );

    const message = await this.roomLookupService.sendMessage(
      room,
      agentInfo.agentID,
      messageData
    );

    // Extract user IDs from mentions to avoid double notifications
    const mentionedUserIDs = mentions
      .filter(m => m.contributorType === 'user')
      .map(m => m.contributorID);

    switch (room.type) {
      case RoomType.POST: {
        const { post, callout, contribution } =
          await this.roomResolverService.getCalloutWithPostContributionForRoom(
            messageData.roomID
          );

        await this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        await this.roomServiceEvents.processNotificationPostContributionComment(
          callout,
          post,
          contribution,
          room,
          message,
          agentInfo,
          mentionedUserIDs
        );

        this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          message,
          agentInfo
        );
        // VC invocation now handled by MessageInboxService via RabbitMQ event

        break;
      }
      case RoomType.CALENDAR_EVENT: {
        const calendarEvent =
          await this.roomResolverService.getCalendarEventForRoom(
            messageData.roomID
          );

        await this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        await this.roomServiceEvents.processNotificationCalendarEventComment(
          calendarEvent,
          room,
          message,
          agentInfo
        );

        break;
      }
      case RoomType.DISCUSSION_FORUM:
        const discussionForum =
          await this.roomResolverService.getDiscussionForRoom(
            messageData.roomID
          );
        await this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );
        await this.roomServiceEvents.processNotificationForumDiscussionComment(
          discussionForum,
          message,
          agentInfo
        );
        break;
      case RoomType.UPDATES:
        await this.roomServiceEvents.processNotificationUpdateSent(
          room,
          message,
          agentInfo
        );
        await this.roomServiceEvents.processActivityUpdateSent(
          room,
          message,
          agentInfo
        );

        break;
      case RoomType.CALLOUT:
        const callout = await this.roomResolverService.getCalloutForRoom(
          messageData.roomID
        );

        // Mentions notifications should be sent regardless of callout visibility per client-web#5557
        await this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        // VC invocation now handled by MessageInboxService via RabbitMQ event

        if (
          callout.settings.visibility === CalloutVisibility.PUBLISHED &&
          callout.calloutsSet?.type === CalloutsSetType.COLLABORATION
        ) {
          await this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            message,
            agentInfo
          );

          await this.roomServiceEvents.processNotificationCalloutComment(
            callout,
            room,
            message,
            agentInfo,
            mentionedUserIDs
          );
        }
        break;
      case RoomType.CONVERSATION:
        // Conversation rooms don't require special event processing i.e. no mentions or other notifications as other
        // contributors would not be able to see the messages
        break;
      case RoomType.CONVERSATION_DIRECT:
        // Publish unread count updates for other members of the conversation
        await this.publishUnreadCountsForConversation(
          messageData.roomID,
          agentInfo.agentID
        );
        break;
      default:
      // ignore for now, later likely to be an exception
    }
    // Subscription will fire when Matrix echoes back via MessageInboxService
    return message;
  }

  private async validateMessageOnCalloutOrFail(room: IRoom) {
    if (room.type === RoomType.CALLOUT) {
      const callout = await this.roomResolverService.getCalloutForRoom(room.id);

      if (!callout.settings.framing.commentsEnabled) {
        throw new CalloutClosedException(
          `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
        );
      }
    }
  }

  /**
   * Validates that the receiver of a direct conversation has messaging enabled.
   * Only applies to CONVERSATION_DIRECT room types (user-to-user conversations).
   */
  private async validateMessageOnDirectConversationOrFail(
    room: IRoom,
    agentInfo: AgentInfo
  ) {
    if (room.type !== RoomType.CONVERSATION_DIRECT) {
      return;
    }

    // Get room members from Matrix (lightweight call - no message history)
    const members = await this.communicationAdapter.getRoomMembers(room.id);

    // Find the other user (not the sender) - members contains agent IDs
    const otherMemberAgentIds = members.filter(
      (memberId: string) => memberId !== agentInfo.agentID
    );

    if (otherMemberAgentIds.length === 0) {
      // Only sender in room, skip validation
      return;
    }

    // For direct conversations, check the first other member's messaging preferences
    // (In practice there should only be 2 members in a direct conversation)
    const receivingUserAgentId = otherMemberAgentIds[0];

    // Look up user by their agent ID
    const receivingUser =
      await this.userLookupService.getUserByAgentId(receivingUserAgentId);

    if (!receivingUser) {
      // Agent ID doesn't map to a user (might be a VC or deleted user)
      return;
    }

    const receivingUserFull = await this.userLookupService.getUserOrFail(
      receivingUser.id,
      {
        relations: {
          settings: true,
        },
      }
    );

    if (
      !receivingUserFull.settings.communication.allowOtherUsersToSendMessages
    ) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.COMMUNICATION,
        {
          receiverId: receivingUser.id,
          senderId: agentInfo.userID,
        }
      );
    }
  }

  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Room.',
  })
  async sendMessageReplyToRoom(
    @Args('messageData') messageData: RoomSendMessageReplyInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
      `room reply to message: ${room.id}`
    );

    const mentions: Mention[] =
      await this.roomMentionsService.getMentionsFromText(messageData.message);
    const threadID = messageData.threadID;

    const messageOwnerId = await this.roomService.getUserIdForMessage(
      room,
      threadID
    );

    const reply = await this.roomLookupService.sendMessageReply(
      room,
      agentInfo.agentID,
      messageData,
      'user'
    );

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      reply
    );

    switch (room.type) {
      case RoomType.POST: {
        const { post } =
          await this.roomResolverService.getCalloutWithPostContributionForRoom(
            messageData.roomID
          );

        await this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );
        await this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          reply,
          agentInfo
        );

        break;
      }
      case RoomType.CALENDAR_EVENT:
        await this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.DISCUSSION_FORUM:
        await this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.CALLOUT: {
        const callout = await this.roomResolverService.getCalloutForRoom(
          messageData.roomID
        );

        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            reply,
            agentInfo
          );

          await this.roomServiceEvents.processNotificationCommentReply(
            room,
            reply,
            agentInfo,
            messageOwnerId
          );
          await this.roomMentionsService.processNotificationMentions(
            mentions,
            room,
            reply,
            agentInfo
          );
        }
        break;
      }
      case RoomType.CONVERSATION:
        // Conversation rooms don't require special event processing for mentions or other notifications as other
        // contributors would not be able to see the messages
        // TODO: what notifications should there be on rooms / replies
        break;
      case RoomType.CONVERSATION_DIRECT:
        // Conversation rooms don't require special event processing i.e. no mentions or other notifications as other
        // contributors would not be able to see the messages
        break;
      default:
      // ignore for now, later likely to be an exception
    }

    return reply;
  }

  @Mutation(() => IMessageReaction, {
    description: 'Add a reaction to a message from the specified Room.',
  })
  async addReactionToMessageInRoom(
    @Args('reactionData') reactionData: RoomAddReactionToMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessageReaction> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      `room add reaction to message in room: ${room.id}`
    );

    const reaction = await this.roomService.addReactionToMessage(
      room,
      agentInfo.agentID,
      reactionData
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the reaction
    return reaction;
  }

  private virtualContributorsEnabled(): boolean {
    return true;
  }

  @Mutation(() => MessageID, {
    description: 'Removes a message.',
  })
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove message: ${room.id}`
    );
    const messageID = await this.roomService.removeRoomMessage(
      room,
      agentInfo.agentID,
      messageData
    );
    await this.inAppNotificationService.deleteAllByMessageId(messageID);
    await this.roomServiceEvents.processActivityMessageRemoved(
      messageID,
      agentInfo
    );

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.DELETE,
      // send empty data, because the resource is deleted
      {
        id: messageID,
        message: '',
        reactions: [],
        sender: '',
        senderType: 'user',
        threadID: '',
        timestamp: -1,
      }
    );

    return messageID;
  }

  @Mutation(() => Boolean, {
    description: 'Remove a reaction on a message from the specified Room.',
  })
  async removeReactionToMessageInRoom(
    @Args('reactionData') reactionData: RoomRemoveReactionToMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the react in question to remove the reaction by
    // extending the authorization policy in memory but do not persist it.

    // Todo: to be tested, may need additional work to get this going
    const extendedAuthorization =
      await this.roomAuthorizationService.extendAuthorizationPolicyForReactionSender(
        room,
        reactionData.reactionID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove reaction: ${room.id}`
    );

    const isDeleted = await this.roomService.removeReactionToMessage(
      room,
      agentInfo.agentID,
      reactionData
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the removal
    return isDeleted;
  }

  /**
   * Publishes unread count updates for other members of a conversation.
   * Called when a new message is sent to a CONVERSATION_DIRECT room.
   */
  private async publishUnreadCountsForConversation(
    roomID: string,
    senderAgentId: string
  ): Promise<void> {
    try {
      // Get the conversation from the room
      const conversation =
        await this.roomResolverService.getConversationForRoom(roomID);

      if (!conversation) {
        return;
      }

      // Get other members of the conversation (excluding the sender)
      const otherMemberships =
        await this.conversationMembershipService.getOtherMemberships(
          conversation.id,
          senderAgentId
        );

      // For each other member, calculate and publish their unread count
      for (const membership of otherMemberships) {
        const unreadCount =
          await this.conversationMembershipService.getUnreadConversationsCount(
            membership.agentId
          );

        // Get the user ID from the agent to publish the subscription
        const user = await this.userLookupService.getUserByAgentId(
          membership.agentId
        );
        if (user) {
          await this.subscriptionPublishService.publishConversationsUnreadCount(
            user.id,
            unreadCount
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the message send
      this.logger.warn?.(
        `Failed to publish unread counts for conversation: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }
}
