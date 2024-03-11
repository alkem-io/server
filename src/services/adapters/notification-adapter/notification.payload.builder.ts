import { ConfigurationTypes, LogContext } from '@common/enums';
import { CommunityType } from '@common/enums/community.type';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Space } from '@domain/challenge/space/space.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { ICommunity } from '@domain/community/community';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';
import { Post } from '@domain/collaboration/post/post.entity';
import {
  CollaborationPostCreatedEventPayload,
  CollaborationPostCommentEventPayload,
  CollaborationInterestPayload,
  CollaborationCalloutPublishedEventPayload,
  JourneyPayload,
  PlatformUserRegistrationEventPayload,
  PlatformUserRemovedEventPayload,
  CommunityNewMemberPayload,
  CommunicationUpdateEventPayload,
  CollaborationContextReviewSubmittedPayload,
  PlatformForumDiscussionCreatedEventPayload,
  CommunicationUserMessageEventPayload,
  CommunicationOrganizationMessageEventPayload,
  CommunicationCommunityLeadsMessageEventPayload,
  CommunicationUserMentionEventPayload,
  CommunicationOrganizationMentionEventPayload,
  CommunityApplicationCreatedEventPayload,
  CollaborationDiscussionCommentEventPayload,
  PlatformForumDiscussionCommentEventPayload,
  createJourneyURL,
  createCalloutURL,
  createPostURL,
  createCalendarEventURL,
  createForumDiscussionUrl,
  CommunityInvitationCreatedEventPayload,
  CollaborationWhiteboardCreatedEventPayload,
  CommentReplyEventPayload,
  CommunityExternalInvitationCreatedEventPayload,
} from '@alkemio/notifications-lib';

import { IRelation } from '@domain/collaboration/relation/relation.interface';
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
    private contributionResolverService: ContributionResolverService
  ) {}

  async buildApplicationCreatedNotificationPayload(
    applicationCreatorID: string,
    applicantID: string,
    community: ICommunity
  ): Promise<CommunityApplicationCreatedEventPayload> {
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunityApplicationCreatedEventPayload = {
      triggeredBy: applicationCreatorID,
      applicantID,
      journey: journeyPayload,
    };

    return payload;
  }

  async buildInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserID: string,
    community: ICommunity
  ): Promise<CommunityInvitationCreatedEventPayload> {
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunityInvitationCreatedEventPayload = {
      triggeredBy: invitationCreatorID,
      inviteeID: invitedUserID,
      journey: journeyPayload,
    };

    return payload;
  }

  async buildExternalInvitationCreatedNotificationPayload(
    invitationCreatorID: string,
    invitedUserEmail: string,
    community: ICommunity,
    message?: string
  ): Promise<CommunityExternalInvitationCreatedEventPayload> {
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunityExternalInvitationCreatedEventPayload = {
      triggeredBy: invitationCreatorID,
      invitees: [{ email: invitedUserEmail }],
      welcomeMessage: message,
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationPostCreatedEventPayload = {
      triggeredBy: eventData.triggeredBy,
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
      },
      post: {
        id: post.id,
        createdBy: post.createdBy,
        displayName: post.profile.displayName,
        nameID: post.nameID,
        type: post.type,
      },
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationWhiteboardCreatedEventPayload = {
      triggeredBy: eventData.triggeredBy,
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
      },
      whiteboard: {
        id: eventData.whiteboard.id,
        createdBy: whiteboard.createdBy || '',
        displayName: whiteboard.profile.displayName,
        nameID: whiteboard.nameID,
      },
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationCalloutPublishedEventPayload = {
      triggeredBy: userId,
      callout: {
        id: callout.id,
        displayName: callout.framing.profile.displayName,
        description: callout.framing.profile.description,
        nameID: callout.nameID,
        type: callout.type,
      },
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationPostCommentEventPayload = {
      triggeredBy: post.createdBy,
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
      },
      post: {
        displayName: post.profile.displayName,
        createdBy: post.createdBy,
        nameID: post.nameID,
      },
      comment: {
        message: messageResult.message,
        createdBy: messageResult.sender,
      },
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationDiscussionCommentEventPayload = {
      triggeredBy: messageResult.sender,
      callout: {
        displayName: callout.framing.profile.displayName,
        nameID: callout.nameID,
      },

      comment: {
        message: messageResult.message,
        createdBy: messageResult.sender,
      },
      journey: journeyPayload,
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
      data.originEntity.id,
      data.originEntity.nameId,
      data.roomId
    );

    const payload: CommentReplyEventPayload = {
      triggeredBy: data.triggeredBy,
      reply: data.reply,
      comment: {
        commentUrl: commentOriginUrl,
        commentOrigin: data.originEntity.displayName,
        commentOwnerId: userData.id,
      },
    };

    return payload;
  }

  async buildCommentCreatedOnForumDiscussionPayload(
    discussion: IDiscussion,
    message: IMessage
  ): Promise<PlatformForumDiscussionCommentEventPayload> {
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
    const discussionUrl = createForumDiscussionUrl(endpoint, discussion.nameID);
    const payload: PlatformForumDiscussionCommentEventPayload = {
      triggeredBy: message.sender,
      discussion: {
        displayName: discussion.profile.displayName,
        createdBy: discussion.createdBy,
        url: discussionUrl,
      },
      comment: {
        message: message.message,
        createdBy: message.sender,
      },
    };

    return payload;
  }

  async buildCommunityNewMemberPayload(
    triggeredBy: string,
    userID: string,
    community: ICommunity
  ): Promise<CommunityNewMemberPayload> {
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunityNewMemberPayload = {
      triggeredBy,
      userID,
      journey: journeyPayload,
    };

    return payload;
  }

  async buildCollaborationInterestPayload(
    userID: string,
    collaboration: ICollaboration,
    relation: IRelation
  ): Promise<CollaborationInterestPayload> {
    const community =
      await this.communityResolverService.getCommunityFromCollaborationOrFail(
        collaboration.id
      );
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationInterestPayload = {
      triggeredBy: userID,
      relation: {
        role: relation.actorRole || '',
        description: relation.description || '',
      },
      journey: journeyPayload,
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

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunicationUpdateEventPayload = {
      triggeredBy: updateCreatorId,
      update: {
        id: updates.id,
        createdBy: updateCreatorId,
      },
      journey: journeyPayload,
    };

    return payload;
  }

  buildUserRegisteredNotificationPayload(
    triggeredBy: string,
    userID: string
  ): PlatformUserRegistrationEventPayload {
    const result: PlatformUserRegistrationEventPayload = {
      triggeredBy: triggeredBy,
      userID: userID,
    };
    return result;
  }

  buildUserRemovedNotificationPayload(
    triggeredBy: string,
    user: IUser
  ): PlatformUserRemovedEventPayload {
    const result: PlatformUserRemovedEventPayload = {
      triggeredBy: triggeredBy,
      user: {
        displayName: user.profile.displayName,
        email: user.email,
      },
    };
    return result;
  }

  async buildCommunityContextReviewSubmittedNotificationPayload(
    userId: string,
    communityId: string,
    questions: CreateNVPInput[]
  ): Promise<CollaborationContextReviewSubmittedPayload> {
    const community = await this.communityResolverService.getCommunity(
      communityId
    );
    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community with id: ${communityId}`,
        LogContext.COMMUNITY
      );
    }

    const journeyPayload = await this.buildJourneyPayload(community);

    return {
      triggeredBy: userId,
      journey: journeyPayload,
      questions,
    };
  }

  async buildPlatformForumDiscussionCreatedNotificationPayload(
    discussion: IDiscussion
  ): Promise<PlatformForumDiscussionCreatedEventPayload> {
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
    const discussionUrl = createForumDiscussionUrl(endpoint, discussion.nameID);
    const payload: PlatformForumDiscussionCreatedEventPayload = {
      triggeredBy: discussion.createdBy,
      discussion: {
        id: discussion.id,
        createdBy: discussion.createdBy,
        displayName: discussion.profile.displayName,
        url: discussionUrl,
      },
    };

    return payload;
  }

  async buildCommunicationUserMessageNotificationPayload(
    senderID: string,
    receiverID: string,
    message: string
  ): Promise<CommunicationUserMessageEventPayload> {
    const { displayName: receiverDisplayName } = await this.getUserDataOrFail(
      receiverID
    );
    const payload: CommunicationUserMessageEventPayload = {
      triggeredBy: senderID,
      messageReceiver: {
        id: receiverID,
        displayName: receiverDisplayName,
      },
      message,
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
    const { displayName: orgDisplayName } = await this.getOrgDataOrFail(
      organizationID
    );
    const payload: CommunicationOrganizationMessageEventPayload = {
      triggeredBy: senderID,
      message,
      organization: {
        id: organizationID,
        displayName: orgDisplayName,
      },
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
    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunicationCommunityLeadsMessageEventPayload = {
      triggeredBy: senderID,
      message,
      journey: journeyPayload,
    };

    return payload;
  }

  async buildCommunicationUserMentionNotificationPayload(
    senderID: string,
    mentionedUserNameID: string,
    comment: string,
    commentsId: string,
    originEntityId: string,
    originEntityNameId: string,
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
      originEntityId,
      originEntityNameId,
      commentsId
    );

    const payload: CommunicationUserMentionEventPayload = {
      triggeredBy: senderID,
      mentionedUser: {
        id: userData.id,
        displayName: userData.displayName,
      },
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
      },
    };

    return payload;
  }

  async buildCommunicationOrganizationMentionNotificationPayload(
    senderID: string,
    mentionedOrgNameID: string,
    comment: string,
    commentsId: string,
    originEntityId: string,
    originEntityNameId: string,
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
      originEntityId,
      originEntityNameId,
      commentsId
    );

    const payload: CommunicationOrganizationMentionEventPayload = {
      triggeredBy: senderID,
      mentionedOrganization: {
        id: orgData.id,
        displayName: orgData.displayName,
      },
      comment,
      commentOrigin: {
        url: commentOriginUrl,
        displayName: originEntityDisplayName,
      },
    };

    return payload;
  }

  private async buildCommentOriginUrl(
    commentType: RoomType,
    originEntityId: string,
    originEntityNameId: string,
    commentsId: string
  ): Promise<string> {
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;

    if (commentType === RoomType.CALLOUT) {
      const community =
        await this.communityResolverService.getCommunityFromCalloutOrFail(
          originEntityId
        );

      if (!community) {
        throw new NotificationEventException(
          `Could not acquire community from callout with id: ${originEntityId}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createCalloutURL(journeyUrl, originEntityNameId);
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
      const callout =
        await this.contributionResolverService.getCalloutForPostContribution(
          originEntityId
        );

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

      if (!callout) {
        throw new NotificationEventException(
          `Could not acquire callout from post with id: ${post.id}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createPostURL(journeyUrl, callout.nameID, post.nameID);
    }

    if (commentType === RoomType.CALENDAR_EVENT) {
      const community =
        await this.communityResolverService.getCommunityFromCalendarEventOrFail(
          originEntityId
        );

      if (!community) {
        throw new NotificationEventException(
          `Could not acquire community from calendar event with id: ${originEntityId}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createCalendarEventURL(journeyUrl, originEntityNameId);
    }

    if (commentType === RoomType.DISCUSSION_FORUM) {
      return createForumDiscussionUrl(endpoint, originEntityNameId);
    }

    throw new NotificationEventException(
      `Comment of type: ${commentType} does not exist.`,
      LogContext.NOTIFICATIONS
    );
  }

  private async buildJourneyPayload(
    community: ICommunity
  ): Promise<JourneyPayload> {
    const displayName =
      await this.communityResolverService.getDisplayNameForCommunityOrFail(
        community.id,
        community.type
      );
    const result: JourneyPayload = {
      spaceID: community.spaceID,
      spaceNameID: await this.getSpaceNameIdOrFail(community.spaceID),
      displayName: displayName,
      type: community.type,
    };
    if (community.type === CommunityType.CHALLENGE) {
      result.challenge = {
        id: community.parentID,
        nameID: await this.getChallengeNameIdOrFail(community.parentID),
      };
    } else if (community.type === CommunityType.OPPORTUNITY) {
      const communityWithParent =
        await this.communityResolverService.getCommunityWithParentOrFail(
          community.id
        );
      const parentCommunity = communityWithParent?.parentCommunity;

      if (!parentCommunity) {
        // this will block sending the event
        throw new EntityNotFoundException(
          `Unable to find parent community of opportunity ${community.id}`,
          LogContext.CHALLENGES
        );
      }
      result.challenge = {
        nameID: await this.getChallengeNameIdOrFail(parentCommunity.parentID),
        id: parentCommunity.parentID,
        opportunity: {
          id: community.parentID,
          nameID: await this.getOpportunityNameIdOrFail(community.parentID),
        },
      };
    }

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

  private async getSpaceNameIdOrFail(spaceID: string): Promise<string> {
    const space = await this.spaceRepository
      .createQueryBuilder('space')
      .where('space.id = :id')
      .setParameters({ id: `${spaceID}` })
      .getOne();

    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with id: ${spaceID}`,
        LogContext.CHALLENGES
      );
    }
    return space.nameID;
  }

  private async getChallengeNameIdOrFail(challengeID: string): Promise<string> {
    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .where('challenge.id = :id')
      .setParameters({ id: `${challengeID}` })
      .getOne();
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find Challenge with id: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }
    return challenge.nameID;
  }

  private async getOpportunityNameIdOrFail(
    opportunityID: string
  ): Promise<string> {
    const opportunity = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.id = :id')
      .setParameters({ id: `${opportunityID}` })
      .getOne();

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with id: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    }

    return opportunity.nameID;
  }
}
