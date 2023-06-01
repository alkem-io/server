import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DiscussionService } from './discussion.service';
import { DiscussionSendMessageInput } from './dto/discussion.dto.send.message';
import { DiscussionRemoveMessageInput } from './dto/discussion.dto.remove.message';
import { IDiscussion } from './discussion.interface';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DiscussionAuthorizationService } from './discussion.service.authorization';
import { MessageID } from '@domain/common/scalars/scalar.messageid';
import { IMessage } from '../message/message.interface';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_DISCUSSION_MESSAGE } from '@common/constants/providers';
import { CommunicationDiscussionUpdated } from '../communication/dto/communication.dto.event.discussion.updated';
import { getRandomId } from '@src/common/utils';
import { DiscussionMessageReceivedPayload } from './dto/discussion.message.received.payload';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { CommentType } from '@common/enums/comment.type';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputForumDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.forum.discussion.comment';
import { DiscussionSendMessageReplyInput } from './dto/discussion.dto.send.message.reply';
import { DiscussionAddMessageReactionInput } from './dto/discussion.dto.add.message.reaction';
import { DiscussionRemoveMessageReactionInput } from './dto/discussion.dto.remove.message.reaction';

@Resolver()
export class DiscussionResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private discussionService: DiscussionService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private notificationAdapter: NotificationAdapter,
    @Inject(SUBSCRIPTION_DISCUSSION_MESSAGE)
    private readonly subscriptionDiscussionMessage: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Sends a message to the specified Discussion. ',
  })
  @Profiling.api
  async sendMessageToDiscussion(
    @Args('messageData') messageData: DiscussionSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID,
      { relations: ['profile'] }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `discussion send message: ${discussion.profile.displayName}`
    );
    const discussionMessage =
      await this.discussionService.sendMessageToDiscussion(
        discussion,
        agentInfo.communicationID,
        messageData
      );

    // Send the subscription event
    const eventID = `discussion-msg-${getRandomId()}`;
    const subscriptionPayload: DiscussionMessageReceivedPayload = {
      eventID: eventID,
      message: discussionMessage,
      discussionID: discussion.id,
    };
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    const eventID2 = `discussion-update-${getRandomId()}`;
    const subscriptionPayloadUpdate: CommunicationDiscussionUpdated = {
      eventID: eventID2,
      discussionID: discussion.id,
    };
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
      subscriptionPayloadUpdate
    );

    const mentions = getMentionsFromText(discussionMessage.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: discussionMessage.message,
      commentsId: discussion.id,
      mentions,
      originEntity: {
        id: discussion.id,
        nameId: discussion.nameID,
        displayName: discussion.profile.displayName,
      },
      commentType: CommentType.FORUM_DISCUSSION,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);

    const forumDiscussionCommentNotificationInput: NotificationInputForumDiscussionComment =
      {
        triggeredBy: agentInfo.userID,
        discussion,
        commentSent: discussionMessage,
      };
    this.notificationAdapter.forumDiscussionComment(
      forumDiscussionCommentNotificationInput
    );

    return discussionMessage;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Discussion. ',
  })
  @Profiling.api
  async sendMessageReplyToDiscussion(
    @Args('messageData') messageData: DiscussionSendMessageReplyInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID,
      { relations: ['profile'] }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `discussion send message: ${discussion.profile.displayName}`
    );
    const discussionMessage =
      await this.discussionService.sendMessageReplyToDiscussion(
        discussion,
        agentInfo.communicationID,
        messageData
      );

    // Send the subscription event
    const eventID = `discussion-msg-${getRandomId()}`;
    const subscriptionPayload: DiscussionMessageReceivedPayload = {
      eventID: eventID,
      message: discussionMessage,
      discussionID: discussion.id,
    };
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED,
      subscriptionPayload
    );

    const eventID2 = `discussion-update-${getRandomId()}`;
    const subscriptionPayloadUpdate: CommunicationDiscussionUpdated = {
      eventID: eventID2,
      discussionID: discussion.id,
    };
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
      subscriptionPayloadUpdate
    );

    const mentions = getMentionsFromText(discussionMessage.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: discussionMessage.message,
      commentsId: discussion.id,
      mentions,
      originEntity: {
        id: discussion.id,
        nameId: discussion.nameID,
        displayName: discussion.profile.displayName,
      },
      commentType: CommentType.FORUM_DISCUSSION,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);

    const forumDiscussionCommentNotificationInput: NotificationInputForumDiscussionComment =
      {
        triggeredBy: agentInfo.userID,
        discussion,
        commentSent: discussionMessage,
      };
    this.notificationAdapter.forumDiscussionComment(
      forumDiscussionCommentNotificationInput
    );

    return discussionMessage;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Add a reaction to a message from the specified Discussion. ',
  })
  @Profiling.api
  async addReactionToMessageInDiscussion(
    @Args('messageData') messageData: DiscussionAddMessageReactionInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID,
      { relations: ['profile'] }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `discussion add reaction on message in: ${discussion.profile.displayName}`
    );
    const discussionMessage =
      await this.discussionService.addReactionToMessageInDiscussion(
        discussion,
        agentInfo.communicationID,
        messageData
      );

    return discussionMessage;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description:
      'Remove a reaction to a message from the specified Discussion. ',
  })
  @Profiling.api
  async removeReactionToMessageInDiscussion(
    @Args('messageData') messageData: DiscussionRemoveMessageReactionInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID,
      { relations: ['profile'] }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.DELETE,
      `discussion remove reaction on a message in: ${discussion.profile.displayName}`
    );

    await this.discussionService.removeReactionToMessageInDiscussion(
      discussion,
      agentInfo.communicationID,
      messageData
    );

    return true;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => MessageID, {
    description: 'Removes a message from the specified Discussion.',
  })
  @Profiling.api
  async removeMessageFromDiscussion(
    @Args('messageData') messageData: DiscussionRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID,
      { relations: ['profile'] }
    );

    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the message in question to remove the message by
    // cloning the authorization policy and then extending but not persisting it.
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        discussion.authorization
      );
    const extendedAuthorization =
      await this.discussionAuthorizationService.extendAuthorizationPolicyForMessageSender(
        discussion,
        messageData.messageID,
        clonedAuthorization
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `communication delete message: ${discussion.profile.displayName}`
    );

    const result = await this.discussionService.removeMessageFromDiscussion(
      discussion,
      agentInfo.communicationID,
      messageData
    );

    // Send out events last
    const eventID = `discussion-update-${getRandomId()}`;
    const subscriptionPayloadUpdate: CommunicationDiscussionUpdated = {
      eventID: eventID,
      discussionID: discussion.id,
    };
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.COMMUNICATION_DISCUSSION_UPDATED,
      subscriptionPayloadUpdate
    );

    return result;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Deletes the specified Discussion.',
  })
  async deleteDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.DELETE,
      `delete discussion: ${discussion.id}`
    );
    return await this.discussionService.deleteDiscussion(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Updates the specified Discussion.',
  })
  async updateDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      updateData.ID,
      {
        relations: ['profile'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.UPDATE,
      `Update discussion: ${discussion.id}`
    );
    return await this.discussionService.updateDiscussion(
      discussion,
      updateData
    );
  }
}
