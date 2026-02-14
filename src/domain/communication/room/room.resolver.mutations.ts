import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RoomType } from '@common/enums/room.type';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MessageID } from '@domain/common/scalars';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMessage } from '../message/message.interface';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomMarkMessageReadInput } from './dto/room.dto.mark.message.read';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';

@InstrumentResolver()
@Resolver()
export class RoomResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private roomResolverService: RoomResolverService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roomLookupService: RoomLookupService,
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
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.CREATE_MESSAGE,
      `room send message: ${room.id}`
    );

    await this.validateMessageOnCalloutOrFail(room);
    await this.validateMessageOnDirectConversationOrFail(room, agentInfo);

    const message = await this.roomLookupService.sendMessage(
      room,
      agentInfo.agentID,
      messageData
    );

    // All post-send processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
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
        with: {
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

    await this.validateMessageOnCalloutOrFail(room);
    await this.validateMessageOnDirectConversationOrFail(room, agentInfo);

    const reply = await this.roomLookupService.sendMessageReply(
      room,
      agentInfo.agentID,
      messageData
    );

    // All post-send processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
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

    // Pass agentInfo.agentID for future use when Matrix admin reflection is implemented
    // See: docs/matrix-admin-reflection.md
    const messageID = await this.roomService.removeRoomMessage(
      room,
      messageData,
      agentInfo.agentID
    );

    // All post-delete processing (notifications, activities, subscriptions)
    // now handled by MessageInboxService via Matrix event
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

    // Pass agentInfo.agentID for future use when Matrix admin reflection is implemented
    // See: docs/matrix-admin-reflection.md
    const isDeleted = await this.roomService.removeReactionToMessage(
      room,
      reactionData,
      agentInfo.agentID
    );

    // Subscription will be published by MessageInboxService when Matrix echoes the removal
    return isDeleted;
  }

  @Mutation(() => Boolean, {
    description: 'Marks a message as read for the current user.',
  })
  async markMessageAsReadInRoom(
    @Args('messageData') messageData: RoomMarkMessageReadInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const room = await this.roomService.getRoomOrFail(messageData.roomID);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      room.authorization,
      AuthorizationPrivilege.READ,
      `room mark message as read: ${room.id}`
    );

    return this.roomService.markMessageAsRead(
      room,
      agentInfo.agentID,
      messageData
    );
  }
}
