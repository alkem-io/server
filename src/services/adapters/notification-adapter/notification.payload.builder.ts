import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Post } from '@domain/collaboration/post/post.entity';
import {
  BaseEventPayload,
  CollaborationCalloutPublishedEventPayload,
  CollaborationDiscussionCommentEventPayload,
  CollaborationPostCommentEventPayload,
  CollaborationPostCreatedEventPayload,
  CollaborationWhiteboardCreatedEventPayload,
  CommentReplyEventPayload,
  CommunicationCommunityLeadsMessageEventPayload,
  OrganizationMentionEventPayload,
  OrganizationMessageEventPayload,
  CommunicationUpdateEventPayload,
  CommunicationUserMentionEventPayload,
  UserMessageEventPayload,
  CommunityApplicationCreatedEventPayload,
  CommunityInvitationCreatedEventPayload,
  CommunityInvitationVirtualContributorCreatedEventPayload,
  CommunityNewMemberPayload,
  CommunityPlatformInvitationCreatedEventPayload,
  ContributorPayload,
  PlatformForumDiscussionCommentEventPayload,
  PlatformForumDiscussionCreatedEventPayload,
  PlatformGlobalRoleChangeEventPayload,
  PlatformUserRegistrationEventPayload,
  PlatformUserRemovedEventPayload,
  RoleChangeType,
  SpaceBaseEventPayload,
  PlatformSpaceCreatedEventPayload,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IMessage } from '@domain/communication/message/message.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Community } from '@domain/community/community/community.entity';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { NotificationInputCommentReply } from './dto/notification.dto.input.comment.reply';
import { NotificationInputWhiteboardCreated } from './dto/notification.dto.input.whiteboard.created';
import { NotificationInputPostCreated } from './dto/notification.dto.input.post.created';
import { NotificationInputPostComment } from './dto/notification.dto.input.post.comment';
import { ContributionResolverService } from '@services/infrastructure/entity-resolver/contribution.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AlkemioConfig } from '@src/types';
import { inferCalloutType } from '@domain/collaboration/callout/deprecated/callout.type.inference';

@Injectable()
export class NotificationPayloadBuilder {
  constructor(
    private contributorLookupService: ContributorLookupService,
    private communityResolverService: CommunityResolverService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private contributionResolverService: ContributionResolverService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  async buildApplicationCreatedNotificationPayload(
    applicationCreatorID: string,
    applicantID: string,
    community: ICommunity
  ): Promise<CommunityApplicationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      applicationCreatorID
    );
    const applicantPayload =
      await this.getContributorPayloadOrFail(applicantID);
    const payload: CommunityApplicationCreatedEventPayload = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserID: string,
    community: ICommunity,
    welcomeMessage?: string
  ): Promise<CommunityInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      invitationCreatorID
    );
    const inviteePayload =
      await this.getContributorPayloadOrFail(invitedUserID);
    const payload: CommunityInvitationCreatedEventPayload = {
      invitee: inviteePayload,
      welcomeMessage,
      ...spacePayload,
    };

    return payload;
  }

  async buildInvitationVirtualContributorCreatedNotificationPayload(
    invitationCreatorID: string,
    virtualContributorID: string,
    accountHost: IContributor,
    community: ICommunity,
    welcomeMessage?: string
  ): Promise<CommunityInvitationVirtualContributorCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      invitationCreatorID
    );

    const hostPayload = await this.getContributorPayloadOrFail(accountHost.id);

    const virtualContributorPayload: ContributorPayload =
      await this.getContributorPayloadOrFail(virtualContributorID);
    const result: CommunityInvitationVirtualContributorCreatedEventPayload = {
      host: hostPayload,
      invitee: virtualContributorPayload,
      welcomeMessage,
      ...spacePayload,
    };
    return result;
  }

  async buildExternalInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserEmail: string,
    community: ICommunity,
    message?: string
  ): Promise<CommunityPlatformInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      invitationCreatorID
    );
    const payload: CommunityPlatformInvitationCreatedEventPayload = {
      invitees: [{ email: invitedUserEmail }],
      welcomeMessage: message,
      ...spacePayload,
    };

    return payload;
  }

  async buildPostCreatedPayload(
    eventData: NotificationInputPostCreated
  ): Promise<CollaborationPostCreatedEventPayload> {
    const callout = eventData.callout;
    const post = eventData.post;

    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );

    const spacePayload = await this.buildSpacePayload(
      community,
      eventData.triggeredBy
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
    const payload: CollaborationPostCreatedEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      post: {
        id: post.id,
        createdBy: post.createdBy,
        displayName: post.profile.displayName,
        nameID: post.nameID,
        url: postURL,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildWhiteboardCreatedPayload(
    eventData: NotificationInputWhiteboardCreated
  ): Promise<CollaborationWhiteboardCreatedEventPayload> {
    const callout = eventData.callout;
    const whiteboard = eventData.whiteboard;
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );

    const spacePayload = await this.buildSpacePayload(
      community,
      eventData.triggeredBy
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const whiteboardURL = await this.urlGeneratorService.getWhiteboardUrlPath(
      whiteboard.id,
      whiteboard.nameID
    );
    const payload: CollaborationWhiteboardCreatedEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      whiteboard: {
        id: eventData.whiteboard.id,
        createdBy: whiteboard.createdBy || '',
        displayName: whiteboard.profile.displayName,
        nameID: whiteboard.nameID,
        url: whiteboardURL,
      },
      ...spacePayload,
    };

    return payload;
  }

  public async buildCalloutPublishedPayload(
    userId: string,
    callout: ICallout
  ): Promise<CollaborationCalloutPublishedEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );

    const spacePayload = await this.buildSpacePayload(community, userId);
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const payload: CollaborationCalloutPublishedEventPayload = {
      callout: {
        id: callout.id,
        displayName: callout.framing.profile.displayName,
        description: callout.framing.profile.description ?? '',
        nameID: callout.nameID,
        type: inferCalloutType(callout), // TODO: CalloutType is deprecated, remove it when possible
        url: calloutURL,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildCommentCreatedOnPostPayload(
    eventData: NotificationInputPostComment
  ): Promise<CollaborationPostCommentEventPayload> {
    const commentsId = eventData.room.id;
    const post = eventData.post;
    const callout =
      await this.contributionResolverService.getCalloutForPostContribution(
        post.id
      );
    const messageResult = eventData.commentSent;
    const community =
      await this.communityResolverService.getCommunityFromPostRoomOrFail(
        commentsId
      );

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from comments with id: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const spacePayload = await this.buildSpacePayload(
      community,
      post.createdBy
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const postURL = await this.urlGeneratorService.getPostUrlPath(post.id);
    const payload: CollaborationPostCommentEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },
      post: {
        displayName: post.profile.displayName,
        createdBy: post.createdBy,
        nameID: post.nameID,
        url: postURL,
      },
      comment: {
        message: messageResult.message,
        createdBy: messageResult.sender,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildCommentCreatedOnDiscussionPayload(
    callout: ICallout,
    commentsId: string,
    messageResult: IMessage
  ): Promise<CollaborationDiscussionCommentEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        callout.id
      );

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from comments with id: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const spacePayload = await this.buildSpacePayload(
      community,
      messageResult.sender
    );
    const calloutURL = await this.urlGeneratorService.getCalloutUrlPath(
      callout.id
    );
    const payload: CollaborationDiscussionCommentEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: calloutURL,
      },

      comment: {
        message: messageResult.message,
        createdBy: messageResult.sender,
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildCommentReplyPayload(
    data: NotificationInputCommentReply
  ): Promise<CommentReplyEventPayload> {
    const userData = await this.getContributorPayloadOrFail(
      data.commentOwnerID
    );

    const commentOriginUrl = await this.buildCommentOriginUrl(
      data.commentType,
      data.originEntity.id
    );

    const basePayload = this.buildBaseEventPayload(data.triggeredBy);
    const payload: CommentReplyEventPayload = {
      reply: data.reply,
      comment: {
        commentUrl: commentOriginUrl,
        commentOrigin: data.originEntity.displayName,
        commentOwnerId: userData.id,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildCommentCreatedOnForumDiscussionPayload(
    discussion: IDiscussion,
    message: IMessage
  ): Promise<PlatformForumDiscussionCommentEventPayload> {
    const basePayload = this.buildBaseEventPayload(message.sender);
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: PlatformForumDiscussionCommentEventPayload = {
      discussion: {
        displayName: discussion.profile.displayName,
        createdBy: discussion.createdBy,
        url: discussionURL,
      },
      comment: {
        message: message.message,
        createdBy: message.sender,
        url: '',
      },
      ...basePayload,
    };

    return payload;
  }

  async buildCommunityNewMemberPayload(
    triggeredBy: string,
    contributorID: string,
    community: ICommunity
  ): Promise<CommunityNewMemberPayload> {
    const spacePayload = await this.buildSpacePayload(community, triggeredBy);
    const memberPayload = await this.getContributorPayloadOrFail(contributorID);
    const payload: CommunityNewMemberPayload = {
      contributor: memberPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildPlatformSpaceCreatedPayload(
    triggeredBy: string,
    community: ICommunity
  ): Promise<PlatformSpaceCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(community, triggeredBy);
    const sender = await this.getContributorPayloadOrFail(triggeredBy);

    return {
      sender: {
        name: sender.profile.displayName,
        url: sender.profile.url,
      },
      created: Date.now(),
      ...spacePayload,
    };
  }

  async buildCommunicationUpdateSentNotificationPayload(
    updateCreatorId: string,
    updates: IRoom
  ): Promise<CommunicationUpdateEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        updates.id
      );

    const spacePayload = await this.buildSpacePayload(
      community,
      updateCreatorId
    );
    const payload: CommunicationUpdateEventPayload = {
      update: {
        id: updates.id,
        createdBy: updateCreatorId,
        url: 'not used',
      },
      ...spacePayload,
    };

    return payload;
  }

  async buildGlobalRoleChangedNotificationPayload(
    triggeredBy: string,
    userID: string,
    type: RoleChangeType,
    role: string
  ): Promise<PlatformGlobalRoleChangeEventPayload> {
    const basePayload = this.buildBaseEventPayload(triggeredBy);
    const userPayload = await this.getContributorPayloadOrFail(userID);
    const actorPayload = await this.getContributorPayloadOrFail(triggeredBy);
    const result: PlatformGlobalRoleChangeEventPayload = {
      user: userPayload,
      actor: actorPayload,
      type,
      role,
      ...basePayload,
    };
    return result;
  }

  async buildUserRegisteredNotificationPayload(
    triggeredBy: string,
    userID: string
  ): Promise<PlatformUserRegistrationEventPayload> {
    const basePayload = this.buildBaseEventPayload(triggeredBy);
    const userPayload = await this.getContributorPayloadOrFail(userID);

    const result: PlatformUserRegistrationEventPayload = {
      user: userPayload,
      ...basePayload,
    };
    return result;
  }

  buildUserRemovedNotificationPayload(
    triggeredBy: string,
    user: IUser
  ): PlatformUserRemovedEventPayload {
    const basePayload = this.buildBaseEventPayload(triggeredBy);
    const result: PlatformUserRemovedEventPayload = {
      user: {
        displayName: user.profile.displayName,
        email: user.email,
      },
      ...basePayload,
    };
    return result;
  }

  async buildPlatformForumDiscussionCreatedNotificationPayload(
    discussion: IDiscussion
  ): Promise<PlatformForumDiscussionCreatedEventPayload> {
    const basePayload = this.buildBaseEventPayload(discussion.createdBy);
    const discussionURL =
      await this.urlGeneratorService.getForumDiscussionUrlPath(discussion.id);
    const payload: PlatformForumDiscussionCreatedEventPayload = {
      discussion: {
        id: discussion.id,
        createdBy: discussion.createdBy,
        displayName: discussion.profile.displayName,
        url: discussionURL,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildUserMessageNotificationPayload(
    senderID: string,
    receiverID: string,
    message: string
  ): Promise<UserMessageEventPayload> {
    const basePayload = this.buildBaseEventPayload(senderID);
    const receiverPayload = await this.getContributorPayloadOrFail(receiverID);
    const payload: UserMessageEventPayload = {
      messageReceiver: receiverPayload,
      message,
      ...basePayload,
    };

    return payload;
  }

  private async getContributorPayloadOrFail(
    contributorID: string
  ): Promise<ContributorPayload> {
    const contributor =
      await this.contributorLookupService.getContributorByUUID(contributorID, {
        relations: {
          profile: true,
        },
      });

    if (!contributor || !contributor.profile) {
      throw new EntityNotFoundException(
        `Unable to find Contributor with profile for id: ${contributorID}`,
        LogContext.COMMUNITY
      );
    }

    const contributorType =
      this.contributorLookupService.getContributorType(contributor);

    const userURL =
      this.urlGeneratorService.createUrlForContributor(contributor);
    const result: ContributorPayload = {
      id: contributor.id,
      nameID: contributor.nameID,
      profile: {
        displayName: contributor.profile.displayName,
        url: userURL,
      },
      type: contributorType,
    };
    return result;
  }

  async buildOrganizationMessageNotificationPayload(
    senderID: string,
    message: string,
    organizationID: string
  ): Promise<OrganizationMessageEventPayload> {
    const basePayload = this.buildBaseEventPayload(senderID);
    const orgContributor =
      await this.getContributorPayloadOrFail(organizationID);
    const payload: OrganizationMessageEventPayload = {
      message,
      organization: orgContributor,
      ...basePayload,
    };

    return payload;
  }

  async buildCommunicationCommunityLeadsMessageNotificationPayload(
    senderID: string,
    message: string,
    communityID: string
  ): Promise<CommunicationCommunityLeadsMessageEventPayload> {
    const community = await this.getCommunityOrFail(communityID);
    const spacePayload = await this.buildSpacePayload(community, senderID);
    const payload: CommunicationCommunityLeadsMessageEventPayload = {
      message,
      ...spacePayload,
    };

    return payload;
  }

  async buildCommunicationUserMentionNotificationPayload(
    senderID: string,
    mentionedUserUUID: string,
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<CommunicationUserMentionEventPayload | undefined> {
    const userContributor =
      await this.getContributorPayloadOrFail(mentionedUserUUID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = this.buildBaseEventPayload(senderID);
    //const userURL = await this.urlGeneratorService.
    const payload: CommunicationUserMentionEventPayload = {
      mentionedUser: userContributor,
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
      },
      ...basePayload,
    };

    return payload;
  }

  async buildOrganizationMentionNotificationPayload(
    senderID: string,
    mentionedOrgUUID: string,
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<OrganizationMentionEventPayload | undefined> {
    const orgData = await this.getContributorPayloadOrFail(mentionedOrgUUID);

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = this.buildBaseEventPayload(senderID);
    const payload: OrganizationMentionEventPayload = {
      mentionedOrganization: orgData,
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
      },
      ...basePayload,
    };

    return payload;
  }

  private async buildCommentOriginUrl(
    commentType: RoomType,
    originEntityId: string
  ): Promise<string> {
    if (commentType === RoomType.CALLOUT) {
      return await this.urlGeneratorService.getCalloutUrlPath(originEntityId);
    }

    if (commentType === RoomType.POST) {
      const post = await this.postRepository.findOne({
        where: {
          id: originEntityId,
        },
      });

      if (!post) {
        throw new NotificationEventException(
          `Could not acquire post with id: ${originEntityId}`,
          LogContext.NOTIFICATIONS
        );
      }

      return await this.urlGeneratorService.getPostUrlPath(post.id);
    }

    if (commentType === RoomType.CALENDAR_EVENT) {
      return await this.urlGeneratorService.getCalendarEventUrlPath(
        originEntityId
      );
    }

    if (commentType === RoomType.DISCUSSION_FORUM) {
      return await this.urlGeneratorService.getForumDiscussionUrlPath(
        originEntityId
      );
    }

    throw new NotificationEventException(
      `Comment of type: ${commentType} does not exist.`,
      LogContext.NOTIFICATIONS
    );
  }

  private async buildSpacePayload(
    community: ICommunity,
    triggeredBy: string
  ): Promise<SpaceBaseEventPayload> {
    const basePayload = this.buildBaseEventPayload(triggeredBy);
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    const url = await this.urlGeneratorService.generateUrlForProfile(
      space.about.profile
    );
    const spaceCommunityAdminUrl =
      await this.urlGeneratorService.createSpaceAdminCommunityURL(space.id);
    const result: SpaceBaseEventPayload = {
      space: {
        id: space.id,
        nameID: space.nameID,
        level: space.level.toString(),
        profile: {
          displayName: space.about.profile.displayName,
          url: url,
        },
        adminURL: spaceCommunityAdminUrl,
      },
      ...basePayload,
    };

    return result;
  }

  private buildBaseEventPayload(triggeredBy: string): BaseEventPayload {
    const result: BaseEventPayload = {
      triggeredBy: triggeredBy,
      platform: {
        url: this.getPlatformURL(),
      },
    };

    return result;
  }

  private async getCommunityOrFail(communityID: string): Promise<ICommunity> {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('community.id = :id')
      .setParameters({ id: communityID })
      .getOne();

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community with id: ${communityID}`,
        LogContext.SPACES
      );
    }
    return community;
  }

  private getPlatformURL(): string {
    return this.configService.get('hosting.endpoint_cluster', { infer: true });
  }
}
