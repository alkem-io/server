import { ConfigurationTypes, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, Repository } from 'typeorm';
import { Post } from '@domain/collaboration/post/post.entity';
import {
  CollaborationPostCreatedEventPayload,
  CollaborationPostCommentEventPayload,
  CollaborationCalloutPublishedEventPayload,
  PlatformUserRegistrationEventPayload,
  PlatformUserRemovedEventPayload,
  CommunityNewMemberPayload,
  CommunicationUpdateEventPayload,
  PlatformForumDiscussionCreatedEventPayload,
  CommunicationUserMessageEventPayload,
  CommunicationOrganizationMessageEventPayload,
  CommunicationCommunityLeadsMessageEventPayload,
  CommunicationUserMentionEventPayload,
  CommunicationOrganizationMentionEventPayload,
  CommunityApplicationCreatedEventPayload,
  CollaborationDiscussionCommentEventPayload,
  PlatformForumDiscussionCommentEventPayload,
  CommunityInvitationCreatedEventPayload,
  CollaborationWhiteboardCreatedEventPayload,
  CommentReplyEventPayload,
  CommunityExternalInvitationCreatedEventPayload,
  BaseEventPayload,
  ContributorPayload,
  SpaceBaseEventPayload,
  PlatformGlobalRoleChangeEventPayload,
  RoleChangeType,
} from '@alkemio/notifications-lib';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IMessage } from '@domain/communication/message/message.interface';
import { IUser } from '@domain/community/user/user.interface';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
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

@Injectable()
export class NotificationPayloadBuilder {
  constructor(
    private communityResolverService: CommunityResolverService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
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
    const applicantPayload = await this.getUserContributorPayloadOrFail(
      applicantID
    );
    const payload: CommunityApplicationCreatedEventPayload = {
      applicant: applicantPayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserID: string,
    community: ICommunity
  ): Promise<CommunityInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      invitationCreatorID
    );
    const inviteePayload = await this.getUserContributorPayloadOrFail(
      invitedUserID
    );
    const payload: CommunityInvitationCreatedEventPayload = {
      invitee: inviteePayload,
      ...spacePayload,
    };

    return payload;
  }

  async buildExternalInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserEmail: string,
    community: ICommunity,
    message?: string
  ): Promise<CommunityExternalInvitationCreatedEventPayload> {
    const spacePayload = await this.buildSpacePayload(
      community,
      invitationCreatorID
    );
    const payload: CommunityExternalInvitationCreatedEventPayload = {
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
      await this.communityResolverService.getCommunityFromCalloutOrFail(
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
        type: post.type,
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
      await this.communityResolverService.getCommunityFromCalloutOrFail(
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
      whiteboard.id
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
      await this.communityResolverService.getCommunityFromCalloutOrFail(
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
        description: callout.framing.profile.description,
        nameID: callout.nameID,
        type: callout.type,
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
      await this.communityResolverService.getCommunityFromCalloutOrFail(
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
    const userData = await this.getUserContributorPayloadOrFail(
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
    userID: string,
    community: ICommunity
  ): Promise<CommunityNewMemberPayload> {
    const spacePayload = await this.buildSpacePayload(community, triggeredBy);
    const memberPayload = await this.getUserContributorPayloadOrFail(userID);
    const payload: CommunityNewMemberPayload = {
      user: memberPayload,
      ...spacePayload,
    };

    return payload;
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
    const userPayload = await this.getUserContributorPayloadOrFail(userID);
    const actorPayload = await this.getUserContributorPayloadOrFail(
      triggeredBy
    );
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
    const userPayload = await this.getUserContributorPayloadOrFail(userID);

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

  async buildCommunicationUserMessageNotificationPayload(
    senderID: string,
    receiverID: string,
    message: string
  ): Promise<CommunicationUserMessageEventPayload> {
    const basePayload = this.buildBaseEventPayload(senderID);
    const receiverPayload = await this.getUserContributorPayloadOrFail(
      receiverID
    );
    const payload: CommunicationUserMessageEventPayload = {
      messageReceiver: receiverPayload,
      message,
      ...basePayload,
    };

    return payload;
  }

  private async getUserContributorPayloadOrFail(
    userId: string
  ): Promise<ContributorPayload> {
    const user = await this.entityManager.findOne(User, {
      where: [
        {
          id: userId,
        },
        {
          nameID: userId,
        },
      ],
      relations: {
        profile: true,
      },
    });

    if (!user || !user.profile) {
      throw new EntityNotFoundException(
        `Unable to find User with profile for id: ${userId}`,
        LogContext.COMMUNITY
      );
    }

    const userURL = await this.urlGeneratorService.createUrlForUserNameID(
      user.nameID
    );
    const result: ContributorPayload = {
      id: user.id,
      nameID: user.nameID,
      profile: {
        displayName: user.profile.displayName,
        url: userURL,
      },
    };
    return result;
  }

  async buildCommunicationOrganizationMessageNotificationPayload(
    senderID: string,
    message: string,
    organizationID: string
  ): Promise<CommunicationOrganizationMessageEventPayload> {
    const basePayload = this.buildBaseEventPayload(senderID);
    const orgContribtor = await this.getOrgContributorPayloadOrFail(
      organizationID
    );
    const payload: CommunicationOrganizationMessageEventPayload = {
      message,
      organization: orgContribtor,
      ...basePayload,
    };

    return payload;
  }

  private async getOrgContributorPayloadOrFail(
    orgId: string
  ): Promise<ContributorPayload> {
    const org = await this.entityManager.findOne(Organization, {
      where: [{ id: orgId }, { nameID: orgId }],
      relations: {
        profile: true,
      },
    });

    if (!org || !org.profile) {
      throw new EntityNotFoundException(
        `Unable to find Organization with id: ${orgId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const orgURL =
      await this.urlGeneratorService.createUrlForOrganizationNameID(org.nameID);
    const result: ContributorPayload = {
      id: org.id,
      nameID: org.nameID,
      profile: {
        displayName: org.profile.displayName,
        url: orgURL,
      },
    };

    return result;
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
    mentionedUserNameID: string,
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<CommunicationUserMentionEventPayload | undefined> {
    const userContributor = await this.getUserContributorPayloadOrFail(
      mentionedUserNameID
    );

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

  async buildCommunicationOrganizationMentionNotificationPayload(
    senderID: string,
    mentionedOrgNameID: string,
    comment: string,
    originEntityId: string,
    originEntityDisplayName: string,
    commentType: RoomType
  ): Promise<CommunicationOrganizationMentionEventPayload | undefined> {
    const orgData = await this.getOrgContributorPayloadOrFail(
      mentionedOrgNameID
    );

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = this.buildBaseEventPayload(senderID);
    const payload: CommunicationOrganizationMentionEventPayload = {
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
      space.profile
    );
    const communityAdminURL =
      await this.urlGeneratorService.createJourneyAdminCommunityURL(space);
    const result: SpaceBaseEventPayload = {
      space: {
        id: space.id,
        nameID: space.nameID,
        type: community.type,
        profile: {
          displayName: space.profile.displayName,
          url: url,
        },
        adminURL: communityAdminURL,
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
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
    return endpoint;
  }
}
