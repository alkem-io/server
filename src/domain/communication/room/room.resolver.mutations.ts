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
import { NamingService } from '@services/infrastructure/naming/naming.service';
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
import { VirtualContributorMessageService } from '../virtual.contributor.message/virtual.contributor.message.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { RoomMentionsService } from '../room-mentions/room.mentions.service';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';

@InstrumentResolver()
@Resolver()
export class RoomResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roomService: RoomService,
    private namingService: NamingService,
    private roomResolverService: RoomResolverService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roomServiceEvents: RoomServiceEvents,
    private roomLookupService: RoomLookupService,
    private roomMentionsService: RoomMentionsService,
    private subscriptionPublishService: SubscriptionPublishService,
    private virtualContributorMessageService: VirtualContributorMessageService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private inAppNotificationService: InAppNotificationService,
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

    const accessVirtualContributors = this.virtualContributorsEnabled();

    const mentions = await this.roomMentionsService.getMentionsFromText(
      messageData.message
    );

    const message = await this.roomLookupService.sendMessage(
      room,
      agentInfo.communicationID,
      messageData
    );
    const threadID = message.id;

    switch (room.type) {
      case RoomType.POST: {
        const { post, callout, contribution } =
          await this.roomResolverService.getCalloutWithPostContributionForRoom(
            messageData.roomID
          );

        this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        this.roomServiceEvents.processNotificationPostContributionComment(
          callout,
          post,
          contribution,
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
        if (accessVirtualContributors) {
          await this.roomMentionsService.processVirtualContributorMentions(
            mentions,
            message.message,
            threadID,
            agentInfo,
            room
          );
        }

        break;
      }
      case RoomType.CALENDAR_EVENT:
        this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        break;
      case RoomType.DISCUSSION_FORUM:
        const discussionForum =
          await this.roomResolverService.getDiscussionForRoom(
            messageData.roomID
          );
        this.roomMentionsService.processNotificationMentions(
          mentions,
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
        this.roomServiceEvents.processNotificationUpdateSent(
          room,
          message,
          agentInfo
        );
        this.roomServiceEvents.processActivityUpdateSent(
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
        this.roomMentionsService.processNotificationMentions(
          mentions,
          room,
          message,
          agentInfo
        );

        if (accessVirtualContributors) {
          await this.roomMentionsService.processVirtualContributorMentions(
            mentions,
            message.message,
            threadID,
            agentInfo,
            room
          );
        }

        if (
          callout.settings.visibility === CalloutVisibility.PUBLISHED &&
          callout.calloutsSet?.type === CalloutsSetType.COLLABORATION
        ) {
          this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            message,
            agentInfo
          );

          this.roomServiceEvents.processNotificationCalloutComment(
            callout,
            room,
            message,
            agentInfo
          );
        }
        break;
      default:
      // ignore for now, later likely to be an exception
    }
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      message
    );
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

    const accessVirtualContributors = this.virtualContributorsEnabled();
    const mentions: Mention[] =
      await this.roomMentionsService.getMentionsFromText(messageData.message);
    const threadID = messageData.threadID;

    const messageOwnerId = await this.roomService.getUserIdForMessage(
      room,
      threadID
    );

    const reply = await this.roomLookupService.sendMessageReply(
      room,
      agentInfo.communicationID,
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

        this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );
        this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          reply,
          agentInfo
        );

        // TODO extract in a helper function
        if (accessVirtualContributors) {
          // Check before processing so as not to reply to same message where interaction started
          const vcInteraction =
            await this.roomMentionsService.getVcInteractionByThread(
              room.id,
              threadID
            );

          await this.roomMentionsService.processVirtualContributorMentions(
            mentions,
            messageData.message,
            threadID,
            agentInfo,
            room
          );

          if (vcInteraction) {
            this.logger.verbose?.(
              `VC Interaction found in thread ${messageData.threadID} in room ${room.id}`,
              LogContext.VIRTUAL_CONTRIBUTOR
            );
            const contextSpaceID =
              await this.roomMentionsService.getSpaceIdForRoom(room);

            const vcMentioned =
              await this.virtualContributorLookupService.getVirtualContributorOrFail(
                vcInteraction.virtualContributorID
              );

            await this.virtualContributorMessageService.invokeVirtualContributor(
              vcMentioned.id,
              messageData.message,
              threadID,
              agentInfo,
              contextSpaceID,
              room,
              vcInteraction
            );
          }
        }

        break;
      }
      case RoomType.CALENDAR_EVENT:
        this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.DISCUSSION_FORUM:
        this.roomServiceEvents.processNotificationCommentReply(
          room,
          reply,
          agentInfo,
          messageOwnerId
        );

        break;
      case RoomType.CALLOUT:
        const callout = await this.roomResolverService.getCalloutForRoom(
          messageData.roomID
        );

        if (accessVirtualContributors) {
          // Check before processing so as not to reply to same message where interaction started
          const vcInteraction =
            await this.roomMentionsService.getVcInteractionByThread(
              room.id,
              threadID
            );
          await this.roomMentionsService.processVirtualContributorMentions(
            mentions,
            messageData.message,
            threadID,
            agentInfo,
            room
          );

          if (vcInteraction) {
            this.logger.verbose?.(
              `VC Interaction found in thread ${messageData.threadID} in room ${room.id}`,
              LogContext.VIRTUAL_CONTRIBUTOR
            );
            const vcMentioned =
              await this.virtualContributorLookupService.getVirtualContributorOrFail(
                vcInteraction.virtualContributorID
              );
            const contextSpaceID =
              await this.roomMentionsService.getSpaceIdForRoom(room);

            await this.virtualContributorMessageService.invokeVirtualContributor(
              vcMentioned.id,
              messageData.message,
              threadID,
              agentInfo,
              contextSpaceID,
              room,
              vcInteraction
            );
          }
        }
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            reply,
            agentInfo
          );

          this.roomServiceEvents.processNotificationCommentReply(
            room,
            reply,
            agentInfo,
            messageOwnerId
          );
          this.roomMentionsService.processNotificationMentions(
            mentions,
            room,
            reply,
            agentInfo
          );
        }
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
      agentInfo.communicationID,
      reactionData
    );

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      reaction,
      reactionData.messageID
    );

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
      agentInfo.communicationID,
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
      agentInfo.communicationID,
      reactionData
    );

    if (isDeleted) {
      this.subscriptionPublishService.publishRoomEvent(
        room,
        MutationType.DELETE,
        // send empty data, because the resource is deleted
        {
          id: reactionData.reactionID,
          emoji: '',
          sender: '',
          timestamp: -1,
        } as IMessageReaction
      );
    }

    return isDeleted;
  }
}
