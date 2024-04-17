import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
import { IMessage } from '../message/message.interface';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPostComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.comment';
import { NotificationInputPostComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.post.comment';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { IPost } from '@domain/collaboration/post/post.interface';
import { RoomType } from '@common/enums/room.type';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { getMentionsFromText } from '../messaging/get.mentions.from.text';
import { IRoom } from './room.interface';
import { NotificationInputForumDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.forum.discussion.comment';
import { IDiscussion } from '../discussion/discussion.interface';
import { NotificationInputUpdateSent } from '@services/adapters/notification-adapter/dto/notification.dto.input.update.sent';
import { ActivityInputUpdateSent } from '@services/adapters/activity-adapter/dto/activity.dto.input.update.sent';
import { ActivityInputMessageRemoved } from '@services/adapters/activity-adapter/dto/activity.dto.input.message.removed';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { NotificationInputDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.discussion.comment';
import { ICallout } from '@domain/collaboration/callout';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { NotificationInputCommentReply } from '@services/adapters/notification-adapter/dto/notification.dto.input.comment.reply';
import { IProfile } from '@domain/common/profile';
import { Mention, MentionedEntityType } from '../messaging/mention.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { VirtualPersonaService } from '@domain/community/virtual-persona/virtual.persona.service';
import { VirtualPersonaQuestionInput } from '@domain/community/virtual-persona/dto/virtual.persona.question.dto.input';
import { MutationType } from '@common/enums/subscriptions/mutation.type';
import { RoomSendMessageReplyInput } from '@domain/communication/room/dto/room.dto.send.message.reply';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service/subscription.publish.service';
import { RoomService } from './room.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { NotSupportedException } from '@common/exceptions';

@Injectable()
export class RoomServiceEvents {
  constructor(
    private activityAdapter: ActivityAdapter,
    private contributionReporter: ContributionReporterService,
    private notificationAdapter: NotificationAdapter,
    private communityResolverService: CommunityResolverService,
    private roomService: RoomService,
    private subscriptionPublishService: SubscriptionPublishService,
    private virtualPersonaService: VirtualPersonaService,
    private virtualContributorService: VirtualContributorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async processVirtualContributorMentions(
    mentions: Mention[],
    question: Pick<IMessage, 'id' | 'message'>,
    agentInfo: AgentInfo,
    room: IRoom,
    accessToVirtualContributors: boolean
  ) {
    for (const mention of mentions) {
      if (mention.type === MentionedEntityType.VIRTUAL_CONTRIBUTOR) {
        // Only throw exception here for the case that there is an actual mention
        if (!accessToVirtualContributors) {
          throw new NotSupportedException(
            `Access to Virtual Contributors is not supported for this room: ${room.id}`,
            LogContext.COMMUNICATION
          );
        }

        this.logger.warn(
          `got mention for VC: ${mention.nameId}`,
          LogContext.COMMUNICATION
        );

        const virtualContributor =
          await this.virtualContributorService.getVirtualContributor(
            mention.nameId,
            {
              relations: {
                virtualPersona: true,
              },
            }
          );

        const virtualPersona = virtualContributor?.virtualPersona;

        if (!virtualPersona) {
          throw new Error(
            `VirtualPersona not loaded for VirtualContributor ${virtualContributor?.nameID}`
          );
        }

        const chatData: VirtualPersonaQuestionInput = {
          virtualPersonaID: virtualPersona.id,
          question: question.message,
        };

        const result = await this.virtualPersonaService.askQuestion(
          chatData,
          agentInfo
        );

        let answer = result.answer;
        this.logger.warn(
          `got answer for VC: ${answer}`,
          LogContext.COMMUNICATION
        );

        if (result.sources) {
          answer = `${answer}\n${result.sources
            .map(({ title, uri }) => `- [${title}](${uri})`)
            .join('\n')}`;
        }

        const answerData: RoomSendMessageReplyInput = {
          message: answer,
          roomID: room.id,
          threadID: question.id,
        };
        const answerMessage = await this.roomService.sendMessageReply(
          room,
          virtualContributor.communicationID,
          answerData,
          'virtualContributor'
        );

        this.subscriptionPublishService.publishRoomEvent(
          room.id,
          MutationType.CREATE,
          answerMessage
        );
      }
    }
  }

  public processNotificationMentions(
    parentEntityId: string,
    parentEntityNameId: string,
    parentEntityProfile: IProfile,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ): Mention[] {
    const mentions = getMentionsFromText(message.message);
    const entityMentionsNotificationInput: NotificationInputEntityMentions = {
      triggeredBy: agentInfo.userID,
      comment: message.message,
      roomId: room.id,
      mentions,
      originEntity: {
        id: parentEntityId,
        nameId: parentEntityNameId,
        displayName: parentEntityProfile.displayName,
      },
      commentType: room.type as RoomType,
    };
    this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
    return mentions;
  }

  public async processNotificationCommentReply(
    parentEntityId: string,
    parentEntityNameId: string,
    parentEntityProfile: IProfile,
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
        id: parentEntityId,
        nameId: parentEntityNameId,
        displayName: parentEntityProfile.displayName,
      },
      commentType: room.type as RoomType,
    };
    await this.notificationAdapter.commentReply(notificationInput);
  }

  public async processNotificationPostComment(
    post: IPost,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    // Send the notification
    const notificationInput: NotificationInputPostComment = {
      triggeredBy: agentInfo.userID,
      post: post,
      room: room,
      commentSent: message,
    };
    await this.notificationAdapter.postComment(notificationInput);
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
    post: IPost,
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputCalloutPostComment = {
      triggeredBy: agentInfo.userID,
      post: post,
      message: message,
    };
    this.activityAdapter.calloutPostComment(activityLogInput);

    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        room.id
      );
    this.contributionReporter.calloutPostCommentCreated(
      {
        id: post.id,
        name: post.profile.displayName,
        space: community.spaceID,
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

    const { spaceID } =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        room.id
      );

    this.contributionReporter.updateCreated(
      {
        id: room.id,
        name: '',
        space: spaceID,
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

    const { spaceID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.contributionReporter.calloutCommentCreated(
      {
        id: callout.id,
        name: callout.nameID,
        space: spaceID,
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
