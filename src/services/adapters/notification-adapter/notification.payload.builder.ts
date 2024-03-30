import { ConfigurationTypes, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Space } from '@domain/challenge/space/space.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICommunity } from '@domain/community/community';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
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
import { SpaceBaseEventPayload } from '@alkemio/notifications-lib/dist/dto/space.base.event.payload';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';

@Injectable()
export class NotificationPayloadBuilder {
  constructor(
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    private communityResolverService: CommunityResolverService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
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
    const payload: CommunityApplicationCreatedEventPayload = {
      applicant: {
        id: applicantID,
        url: 'TO: fix me',
        displayName: 'TO: fix me',
      },
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
    const payload: CommunityInvitationCreatedEventPayload = {
      invitee: {
        id: invitedUserID,
        url: 'TO: fix me',
        displayName: 'TO: fix me',
      },
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
    const payload: CollaborationPostCreatedEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: 'TO: fix me',
      },
      post: {
        id: post.id,
        createdBy: post.createdBy,
        displayName: post.profile.displayName,
        nameID: post.nameID,
        type: post.type,
        url: 'TO: fix me',
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
    const payload: CollaborationWhiteboardCreatedEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: 'TO: fix me',
      },
      whiteboard: {
        id: eventData.whiteboard.id,
        createdBy: whiteboard.createdBy || '',
        displayName: whiteboard.profile.displayName,
        nameID: whiteboard.nameID,
        url: 'TO: fix me',
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
    const payload: CollaborationCalloutPublishedEventPayload = {
      callout: {
        id: callout.id,
        displayName: callout.framing.profile.displayName,
        description: callout.framing.profile.description,
        nameID: callout.nameID,
        type: callout.type,
        url: 'TO: fix me',
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
    const payload: CollaborationPostCommentEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: 'TO: fix me',
      },
      post: {
        displayName: post.profile.displayName,
        createdBy: post.createdBy,
        nameID: post.nameID,
        url: 'TO: fix me',
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
    const payload: CollaborationDiscussionCommentEventPayload = {
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
        url: 'TO: fix me',
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
    const userData = await this.getUserData(data.commentOwnerID);

    if (!userData)
      throw new NotificationEventException(
        `Could not find User with id: ${data.commentOwnerID}`,
        LogContext.NOTIFICATIONS
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
    const payload: PlatformForumDiscussionCommentEventPayload = {
      discussion: {
        displayName: discussion.profile.displayName,
        createdBy: discussion.createdBy,
        url: 'to: fix me',
      },
      comment: {
        message: message.message,
        createdBy: message.sender,
        url: 'to: fix me',
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
    const payload: CommunityNewMemberPayload = {
      user: {
        id: userID,
        url: 'TO: fix me',
        displayName: 'TO: fix me',
      },
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
        url: 'TO: fix me',
      },
      ...spacePayload,
    };

    return payload;
  }

  buildUserRegisteredNotificationPayload(
    triggeredBy: string,
    userID: string
  ): PlatformUserRegistrationEventPayload {
    const basePayload = this.buildBaseEventPayload(triggeredBy);
    const result: PlatformUserRegistrationEventPayload = {
      user: {
        id: userID,
        url: 'TO: fix me',
        displayName: 'TO: fix me',
      },
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
    const payload: PlatformForumDiscussionCreatedEventPayload = {
      discussion: {
        id: discussion.id,
        createdBy: discussion.createdBy,
        displayName: discussion.profile.displayName,
        url: 'TO: fix me',
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
    const { displayName: receiverDisplayName } = await this.getUserDataOrFail(
      receiverID
    );
    const payload: CommunicationUserMessageEventPayload = {
      messageReceiver: {
        id: receiverID,
        displayName: receiverDisplayName,
        url: 'TO: fix me',
      },
      message,
      ...basePayload,
    };

    return payload;
  }

  private async getUserDataOrFail(
    userId: string
  ): Promise<{ id: string; displayName: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.nameID'])
      .leftJoin('user.profile', 'profile')
      .addSelect(['profile.displayName'])
      .where('user.nameID = :id')
      .orWhere('user.id = :id')
      .setParameters({ id: userId })
      .getOne();

    if (!user || !user.profile) {
      throw new EntityNotFoundException(
        `Unable to find User with profile for id: ${userId}`,
        LogContext.COMMUNITY
      );
    }
    return { id: user.id, displayName: user.profile.displayName };
  }

  private async getUserData(
    userId: string
  ): Promise<{ id: string; displayName: string } | undefined> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id'])
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.nameID = :id')
      .orWhere('user.id = :id')
      .setParameters({ id: userId })
      .getOne();

    if (!user || !user.profile) {
      return undefined;
    }
    return { id: user.id, displayName: user.profile.displayName };
  }

  async buildCommunicationOrganizationMessageNotificationPayload(
    senderID: string,
    message: string,
    organizationID: string
  ): Promise<CommunicationOrganizationMessageEventPayload> {
    const basePayload = this.buildBaseEventPayload(senderID);
    const { displayName: orgDisplayName } = await this.getOrgDataOrFail(
      organizationID
    );
    const payload: CommunicationOrganizationMessageEventPayload = {
      message,
      organization: {
        id: organizationID,
        displayName: orgDisplayName,
        url: 'TO: fix me',
      },
      ...basePayload,
    };

    return payload;
  }

  private async getOrgDataOrFail(
    orgId: string
  ): Promise<{ id: string; displayName: string }> {
    const org = await this.organizationRepository
      .createQueryBuilder('organization')
      .select(['organization.id'])
      .leftJoin('organization.profile', 'profile')
      .addSelect(['profile.displayName'])
      .where('organization.id = :id')
      .orWhere('organization.nameID = :id')
      .setParameters({ id: orgId })
      .getOne();

    if (!org || !org.profile) {
      throw new EntityNotFoundException(
        `Unable to find Organization with id: ${orgId}`,
        LogContext.COMMUNITY
      );
    }
    return { id: org.id, displayName: org.profile.displayName };
  }

  private async getOrgData(
    orgId: string
  ): Promise<{ id: string; displayName: string } | undefined> {
    const org = await this.organizationRepository
      .createQueryBuilder('organization')
      .select(['organization.id'])
      .leftJoin('organization.profile', 'profile')
      .addSelect(['profile.displayName'])
      .where('organization.id = :id')
      .orWhere('organization.nameID = :id')
      .setParameters({ id: orgId })
      .getOne();

    if (!org || !org.profile) {
      return undefined;
    }
    return { id: org.id, displayName: org.profile.displayName };
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
    const userData = await this.getUserData(mentionedUserNameID);

    if (!userData)
      throw new NotificationEventException(
        `Could not find User with id: ${mentionedUserNameID}`,
        LogContext.NOTIFICATIONS
      );

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = this.buildBaseEventPayload(senderID);
    const payload: CommunicationUserMentionEventPayload = {
      mentionedUser: {
        id: userData.id,
        displayName: userData.displayName,
        url: 'TO: fix me',
      },
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
    const orgData = await this.getOrgData(mentionedOrgNameID);

    if (!orgData)
      throw new NotificationEventException(
        `Could not find User with id: ${mentionedOrgNameID}`,
        LogContext.NOTIFICATIONS
      );

    const commentOriginUrl = await this.buildCommentOriginUrl(
      commentType,
      originEntityId
    );

    const basePayload = this.buildBaseEventPayload(senderID);
    const payload: CommunicationOrganizationMentionEventPayload = {
      mentionedOrganization: {
        id: orgData.id,
        profile: {
          displayName: orgData.displayName,
          url: 'TO: fix me',
        },
      },
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

      return await this.urlGeneratorService.getPostUrlPath('id', post.id);
    }

    if (commentType === RoomType.CALENDAR_EVENT) {
      return await this.urlGeneratorService.getCalendarEventUrlPath(
        'id',
        originEntityId
      );
    }

    if (commentType === RoomType.DISCUSSION_FORUM) {
      return await this.urlGeneratorService.getForumDiscussionUrlPath(
        'id',
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
    const baseChallenge =
      await this.communityResolverService.getBaseChallengeForCommunityOrFail(
        community.id,
        community.type
      );
    const url = await this.urlGeneratorService.generateUrlForProfile(
      baseChallenge.profile
    );
    const result: SpaceBaseEventPayload = {
      space: {
        id: baseChallenge.id,
        nameID: baseChallenge.nameID,
        type: community.type,
        profile: {
          displayName: baseChallenge.profile.displayName,
          url: url,
        },
        adminURL: 'TO: fix me',
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
        LogContext.CHALLENGES
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
