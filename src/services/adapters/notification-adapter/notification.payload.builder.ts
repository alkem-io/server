import { ConfigurationTypes, LogContext } from '@common/enums';
import { CommunityType } from '@common/enums/community.type';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { IUpdates } from '@domain/communication/updates/updates.interface';
import { ICommunity } from '@domain/community/community';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';
import { Aspect } from '@src/domain/collaboration/aspect/aspect.entity';
import {
  CollaborationCardCreatedEventPayload,
  CollaborationCardCommentEventPayload,
  CollaborationInterestPayload,
  CollaborationCalloutPublishedEventPayload,
  JourneyPayload,
  PlatformUserRegistrationEventPayload,
  PlatformUserRemovedEventPayload,
  CommunityNewMemberPayload,
  CommunicationUpdateEventPayload,
  CollaborationContextReviewSubmittedPayload,
  CommunicationDiscussionCreatedEventPayload,
  CommunicationUserMessageEventPayload,
  CommunicationOrganizationMessageEventPayload,
  CommunicationCommunityLeadsMessageEventPayload,
  CommunicationUserMentionEventPayload,
  CommunicationOrganizationMentionEventPayload,
  CommunityApplicationCreatedEventPayload,
  CollaborationDiscussionCommentEventPayload,
  CollaborationCanvasCreatedEventPayload,
  createJourneyURL,
  createCalloutURL,
  createCardURL,
  createCalendarEventURL,
} from '@alkemio/notifications-lib';

import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { IMessage } from '@domain/communication/message/message.interface';
import { IAspect } from '@domain/collaboration/aspect';
import { IUser } from '@domain/community/user/user.interface';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { Community } from '@domain/community/community/community.entity';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { CommentType } from '@common/enums/comment.type';

@Injectable()
export class NotificationPayloadBuilder {
  constructor(
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    private communityResolverService: CommunityResolverService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
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

  async buildCardCreatedPayload(
    cardId: string
  ): Promise<CollaborationCardCreatedEventPayload> {
    const card = await this.aspectRepository.findOne(
      { id: cardId },
      { relations: ['callout', 'profile'] }
    );
    if (!card) {
      throw new NotificationEventException(
        `Could not acquire aspect from id: ${cardId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const callout = card.callout;
    if (!callout) {
      throw new NotificationEventException(
        `Could not acquire callout from aspect with id: ${cardId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationCardCreatedEventPayload = {
      triggeredBy: card.createdBy,
      callout: {
        displayName: callout.displayName,
        nameID: callout.nameID,
      },
      card: {
        id: cardId,
        createdBy: card.createdBy,
        displayName: card.profile.displayName,
        nameID: card.nameID,
        type: card.type,
      },
      journey: journeyPayload,
    };

    return payload;
  }

  async buildCanvasCreatedPayload(
    canvasId: string
  ): Promise<CollaborationCanvasCreatedEventPayload> {
    const canvas = await this.canvasRepository.findOne({
      where: { id: canvasId },
      relations: ['callout'],
    });
    if (!canvas) {
      throw new NotificationEventException(
        `Could not acquire canvas from id: ${canvasId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const callout = canvas.callout;
    if (!callout) {
      throw new NotificationEventException(
        `Could not acquire callout from canvas with id: ${canvasId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationCanvasCreatedEventPayload = {
      triggeredBy: canvas.createdBy,
      callout: {
        displayName: callout.displayName,
        nameID: callout.nameID,
      },
      canvas: {
        id: canvasId,
        createdBy: canvas.createdBy,
        displayName: canvas.displayName,
        nameID: canvas.nameID,
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
        displayName: callout.displayName,
        description: callout.description,
        nameID: callout.nameID,
        type: callout.type,
      },
      journey: journeyPayload,
    };

    return payload;
  }

  async buildCommentCreatedOnCardPayload(
    aspect: IAspect,
    commentsId: string,
    messageResult: IMessage
  ): Promise<CollaborationCardCommentEventPayload> {
    const card = await this.aspectRepository.findOne(
      { id: aspect.id },
      { relations: ['callout', 'profile'] }
    );

    if (!card) {
      throw new NotificationEventException(
        `Could not acquire card with id: ${aspect.id}`,
        LogContext.NOTIFICATIONS
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromCardCommentsOrFail(
        commentsId
      );

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from comments with id: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }
    const callout = card.callout;
    if (!callout) {
      throw new NotificationEventException(
        `Could not acquire callout from card with id: ${card.id}`,
        LogContext.NOTIFICATIONS
      );
    }

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CollaborationCardCommentEventPayload = {
      triggeredBy: card.createdBy,
      callout: {
        displayName: callout.displayName,
        nameID: callout.nameID,
      },
      card: {
        displayName: card.profile.displayName,
        createdBy: card.createdBy,
        nameID: card.nameID,
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
        displayName: callout.displayName,
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
    updates: IUpdates
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
    challengeId: string,
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

  async buildCommunicationDiscussionCreatedNotificationPayload(
    discussion: IDiscussion
  ): Promise<CommunicationDiscussionCreatedEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromDiscussionOrFail(
        discussion.id
      );

    const journeyPayload = await this.buildJourneyPayload(community);
    const payload: CommunicationDiscussionCreatedEventPayload = {
      triggeredBy: discussion.createdBy,
      discussion: {
        id: discussion.id,
        createdBy: discussion.createdBy,
        title: discussion.title,
        description: discussion.description,
      },
      journey: journeyPayload,
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
    commentType: CommentType
  ): Promise<CommunicationUserMentionEventPayload | undefined> {
    const userData = await this.getUserData(mentionedUserNameID);

    if (!userData) return undefined;

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
    mentionedUserNameID: string,
    comment: string,
    commentsId: string,
    originEntityId: string,
    originEntityNameId: string,
    originEntityDisplayName: string,
    commentType: CommentType
  ): Promise<CommunicationOrganizationMentionEventPayload | undefined> {
    const orgData = await this.getOrgData(mentionedUserNameID);

    if (!orgData) return undefined;

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
    commentType: CommentType,
    originEntityId: string,
    originEntityNameId: string,
    commentsId: string
  ): Promise<string> {
    const endpoint = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;

    if (commentType === CommentType.DISCUSSION) {
      const community =
        await this.communityResolverService.getCommunityFromCalloutOrFail(
          originEntityId
        );

      if (!community) {
        throw new NotificationEventException(
          `Could not acquire community from comments with id: ${commentsId}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createCalloutURL(journeyUrl, originEntityNameId);
    }

    if (commentType === CommentType.CARD) {
      const card = await this.aspectRepository.findOne({
        where: {
          id: originEntityId,
        },
        relations: ['callout'],
      });

      if (!card) {
        throw new NotificationEventException(
          `Could not acquire card with id: ${originEntityId}`,
          LogContext.NOTIFICATIONS
        );
      }

      const community =
        await this.communityResolverService.getCommunityFromCardCommentsOrFail(
          commentsId
        );

      if (!community) {
        throw new NotificationEventException(
          `Could not acquire community from comments with id: ${commentsId}`,
          LogContext.NOTIFICATIONS
        );
      }
      const callout = card.callout;
      if (!callout) {
        throw new NotificationEventException(
          `Could not acquire callout from card with id: ${card.id}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createCardURL(journeyUrl, callout.nameID, card.nameID);
    }

    if (commentType === CommentType.CALENDAR_EVENT) {
      const community =
        await this.communityResolverService.getCommunityFromCalendarEventOrFail(
          originEntityId
        );

      if (!community) {
        throw new NotificationEventException(
          `Could not acquire community from comments with id: ${commentsId}`,
          LogContext.NOTIFICATIONS
        );
      }

      const journeyPayload = await this.buildJourneyPayload(community);
      const journeyUrl = createJourneyURL(endpoint, journeyPayload);
      return createCalendarEventURL(journeyUrl, originEntityNameId);
    }

    return endpoint;
  }

  private async buildJourneyPayload(
    community: ICommunity
  ): Promise<JourneyPayload> {
    const result: JourneyPayload = {
      hubID: community.hubID,
      hubNameID: await this.getHubNameIdOrFail(community.hubID),
      displayName: community.displayName,
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

  private async getHubNameIdOrFail(hubID: string): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .where('hub.id = :id')
      .setParameters({ id: `${hubID}` })
      .getOne();

    if (!hub) {
      throw new EntityNotFoundException(
        `Unable to find Hub with id: ${hubID}`,
        LogContext.CHALLENGES
      );
    }
    return hub.nameID;
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
