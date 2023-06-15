import { UseGuards } from '@nestjs/common';
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
import { RoomAuthorizationService } from './room.service.authorization';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { RoomType } from '@common/enums/room.type';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { NotSupportedException } from '@common/exceptions/not.supported.exception';
import { LogContext } from '@common/enums/logging.context';
import { RoomServiceEvents } from './room.service.events';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';

@Resolver()
export class RoomResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private namingService: NamingService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roomServiceEvents: RoomServiceEvents
  ) {}

  // todo should be removed to serve per entity e.g. send post comment
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
      AuthorizationPrivilege.CREATE_MESSAGE,
      `room send message: ${room.id}`
    );

    if (room.type === RoomType.CALLOUT) {
      const callout = await this.namingService.getCalloutForRoom(
        messageData.roomID
      );

      if (callout.type !== CalloutType.COMMENTS) {
        throw new NotSupportedException(
          'Messages only supported on Comments Callout',
          LogContext.COLLABORATION
        );
      }

      if (callout.state === CalloutState.CLOSED) {
        throw new CalloutClosedException(
          `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
        );
      }
    }

    const message = await this.roomService.sendMessage(
      room,
      agentInfo.communicationID,
      messageData
    );

    this.roomServiceEvents.processMessageReceivedSubscription(room, message);

    switch (room.type) {
      case RoomType.POST:
        const post = await this.namingService.getPostForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationMentions(
          post,
          room,
          message,
          agentInfo
        );
        this.roomServiceEvents.processNotificationPostComment(
          post,
          room,
          message,
          agentInfo
        );
        this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          message,
          agentInfo
        );

        break;
      case RoomType.CALENDAR_EVENT:
        const calendar = await this.namingService.getCalendarEventForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationMentions(
          calendar,
          room,
          message,
          agentInfo
        );

        break;
      case RoomType.DISCUSSION:
        const discussion = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationMentions(
          discussion,
          room,
          message,
          agentInfo
        );
        break;
      case RoomType.DISCUSSION_FORUM:
        const discussionForum = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );
        this.roomServiceEvents.processNotificationMentions(
          discussionForum,
          room,
          message,
          agentInfo
        );
        this.roomServiceEvents.processNotificationForumDiscussionComment(
          discussionForum,
          message,
          agentInfo
        );
        break;
      case RoomType.UPDATES:
        this.roomServiceEvents.processNotificationUpdateSent(room, agentInfo);
        this.roomServiceEvents.processActivityUpdateSent(
          room,
          message,
          agentInfo
        );

        break;
      case RoomType.CALLOUT:
        const callout = await this.namingService.getCalloutForRoom(
          messageData.roomID
        );

        if (callout.visibility === CalloutVisibility.PUBLISHED) {
          this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            message,
            agentInfo
          );
          this.roomServiceEvents.processNotificationDiscussionComment(
            callout,
            room,
            message,
            agentInfo
          );
          this.roomServiceEvents.processNotificationMentions(
            callout,
            room,
            message,
            agentInfo
          );
        }
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
    await this.roomServiceEvents.processActivityMessageRemoved(
      messageID,
      agentInfo
    );

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

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
      `room reply to message: ${room.id}`
    );

    const messageOwnerId = await this.roomService.getUserIdForMessage(
      room,
      messageData.threadID
    );

    const reply = await this.roomService.sendMessageReply(
      room,
      agentInfo.communicationID,
      messageData
    );

    this.roomServiceEvents.processMessageReceivedSubscription(room, reply);

    switch (room.type) {
      case RoomType.POST:
        const post = await this.namingService.getPostForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationCommentReply(
          post,
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.CALENDAR_EVENT:
        const calendar = await this.namingService.getCalendarEventForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationCommentReply(
          calendar,
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.DISCUSSION:
        const discussion = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );

        this.roomServiceEvents.processNotificationCommentReply(
          discussion,
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.DISCUSSION_FORUM:
        const discussionForum = await this.namingService.getDiscussionForRoom(
          messageData.roomID
        );
        this.roomServiceEvents.processNotificationCommentReply(
          discussionForum,
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.CALLOUT:
        const callout = await this.namingService.getCalloutForRoom(
          messageData.roomID
        );

        if (callout.visibility === CalloutVisibility.PUBLISHED) {
          this.roomServiceEvents.processNotificationCommentReply(
            callout,
            room,
            reply,
            agentInfo,
            messageOwnerId
          );
        }
      default:
      // ignore for now, later likely to be an exception
    }

    return reply;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessageReaction, {
    description: 'Add a reaction to a message from the specified Room.',
  })
  @Profiling.api
  async addReactionToMessageInRoom(
    @Args('reactionData') reactionData: RoomAddReactionToMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessageReaction> {
    const room = await this.roomService.getRoomOrFail(reactionData.roomID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
      `room add reaction to message in room: ${room.id}`
    );

    const reaction = await this.roomService.addReactionToMessage(
      room,
      agentInfo.communicationID,
      reactionData
    );

    return reaction;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Remove a reaction on a message from the specified Room.',
  })
  @Profiling.api
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

    return await this.roomService.removeReactionToMessage(
      room,
      agentInfo.communicationID,
      reactionData
    );
  }
}
