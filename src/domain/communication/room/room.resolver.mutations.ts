import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IMessage, {
    description:
      'Sends an comment message. Returns the id of the new Update message.',
  })
  async sendMessageToRoom(
    @Args('messageData') messageData: RoomSendMessageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID, {
      relations: { authorization: true },
    });

    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE,
      `room send message: ${room.id}`
    );

    await this.validateMessageOnCalloutOrFail(room);
    await this.validateMessageOnDirectConversationOrFail(room, actorContext);

    // Update VC options on room if provided (for conversation rooms with VCs)
    if (messageData.vcOptions?.language) {
      await this.updateRoomVcOptions(room, messageData.vcOptions.language);
    }

    const mentions = await this.roomMentionsService.getMentionsFromText(
      messageData.message
    );

    const message = await this.roomLookupService.sendMessage(
      room,
      actorContext.actorId,
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
          actorContext
        );

        await this.roomServiceEvents.processNotificationPostContributionComment(
          callout,
          post,
          contribution,
          room,
          message,
          actorContext,
          mentionedUserIDs
        );

        void this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          message,
          actorContext
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
          actorContext
        );

        await this.roomServiceEvents.processNotificationCalendarEventComment(
          calendarEvent,
          room,
          message,
          actorContext
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
          actorContext
        );
        await this.roomServiceEvents.processNotificationForumDiscussionComment(
          discussionForum,
          message,
          actorContext
        );
        break;
      case RoomType.UPDATES:
        await this.roomServiceEvents.processNotificationUpdateSent(
          room,
          message,
          actorContext
        );
        await this.roomServiceEvents.processActivityUpdateSent(
          room,
          message,
          actorContext
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
          actorContext
        );

        // VC invocation now handled by MessageInboxService via RabbitMQ event

        if (
          callout.settings.visibility === CalloutVisibility.PUBLISHED &&
          callout.calloutsSet?.type === CalloutsSetType.COLLABORATION
        ) {
          await this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            message,
            actorContext
          );

          await this.roomServiceEvents.processNotificationCalloutComment(
            callout,
            room,
            message,
            actorContext,
            mentionedUserIDs
          );
        }
        break;
      case RoomType.CONVERSATION:
        // Conversation rooms don't require special event processing i.e. no mentions or other notifications as other
        // contributors would not be able to see the messages
        break;
      case RoomType.CONVERSATION_DIRECT:
        // Conversation rooms don't require special event processing i.e. no mentions or other notifications as other
        // contributors would not be able to see the messages
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
   * Updates VC options (e.g., language preference) on the room.
   * Only updates if the value has changed.
   */
  private async updateRoomVcOptions(
    room: IRoom,
    language: string
  ): Promise<void> {
    if (room.vcData?.language === language) {
      return;
    }

    if (!room.vcData) {
      room.vcData = {};
    }
    room.vcData.language = language;
    await this.roomLookupService.save(room);
  }

  /**
   * Validates that the receiver of a direct conversation has messaging enabled.
   * Only applies to CONVERSATION_DIRECT room types (user-to-user conversations).
   */
  private async validateMessageOnDirectConversationOrFail(
    room: IRoom,
    actorContext: ActorContext
  ) {
    if (room.type !== RoomType.CONVERSATION_DIRECT) {
      return;
    }

    // Get room members from Matrix (lightweight call - no message history)
    const members = await this.communicationAdapter.getRoomMembers(room.id);

    // Find the other user (not the sender) - members contains actor IDs
    const otherMemberActorIds = members.filter(
      (memberId: string) => memberId !== actorContext.actorId
    );

    if (otherMemberActorIds.length === 0) {
      // Only sender in room, skip validation
      return;
    }

    // For direct conversations, check the first other member's messaging preferences
    // (In practice there should only be 2 members in a direct conversation)
    const receivingUserActorId = otherMemberActorIds[0];

    // Look up user by their actor ID
    const receivingUser =
      await this.userLookupService.getUserById(receivingUserActorId);

    if (!receivingUser) {
      // Actor ID doesn't map to a user (might be a VC or deleted user)
      return;
    }

    const receivingUserFull = await this.userLookupService.getUserByIdOrFail(
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
          senderId: actorContext.actorId,
        }
      );
    }
  }

  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Room.',
  })
  async sendMessageReplyToRoom(
    @Args('messageData') messageData: RoomSendMessageReplyInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
      actorContext.actorId,
      messageData
    );

    void this.subscriptionPublishService.publishRoomEvent(
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
          actorContext,
          messageOwnerId
        );
        await this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          reply,
          actorContext
        );

        break;
      }
      case RoomType.CALENDAR_EVENT:
        await this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          actorContext,
          messageOwnerId
        );

        break;
      case RoomType.DISCUSSION_FORUM:
        await this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          actorContext,
          messageOwnerId
        );

        break;
      case RoomType.CALLOUT: {
        const callout = await this.roomResolverService.getCalloutForRoom(
          messageData.roomID
        );

        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          void this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            reply,
            actorContext
          );

          await this.roomServiceEvents.processNotificationCommentReply(
            room,
            reply,
            actorContext,
            messageOwnerId
          );
          await this.roomMentionsService.processNotificationMentions(
            mentions,
            room,
            reply,
            actorContext
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
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessageReaction> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      `room add reaction to message in room: ${room.id}`
    );

    const reaction = await this.roomService.addReactionToMessage(
      room,
      actorContext.actorId,
      reactionData
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the reaction
    return reaction;
  }

  @Mutation(() => MessageID, {
    description: 'Removes a message.',
  })
  async removeMessageOnRoom(
    @Args('messageData') messageData: RoomRemoveMessageInput,
    @CurrentActor() actorContext: ActorContext
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
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove message: ${room.id}`
    );
    const messageID = await this.roomService.removeRoomMessage(
      room,
      actorContext.actorId,
      messageData
    );
    await this.inAppNotificationService.deleteAllByMessageId(messageID);
    await this.roomServiceEvents.processActivityMessageRemoved(
      messageID,
      actorContext
    );

    void this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.DELETE,
      // send empty data, because the resource is deleted
      {
        id: messageID,
        message: '',
        reactions: [],
        sender: '',
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
    @CurrentActor() actorContext: ActorContext
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
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `room remove reaction: ${room.id}`
    );

    const isDeleted = await this.roomService.removeReactionToMessage(
      room,
      actorContext.actorId,
      reactionData
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the removal
    return isDeleted;
  }
}
