import { LogContext } from '@common/enums';
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
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import {
  AspectCreatedEventPayload,
  AspectCommentCreatedEventPayload,
  CommunityCollaborationInterestEventPayload,
  CalloutPublishedEventPayload,
} from './event-payloads';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { HubPayload } from './event-payloads/hub.payload';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async buildApplicationCreatedNotificationPayload(
    applicationCreatorID: string,
    applicantID: string,
    community: ICommunity
  ) {
    const hubPayload = await this.buildHubPayload(community);
    const payload: any = {
      applicationCreatorID,
      applicantID,
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildAspectCreatedPayload(aspectId: string) {
    const aspect = await this.aspectRepository.findOne(
      { id: aspectId },
      { relations: ['callout'] }
    );
    if (!aspect) {
      throw new NotificationEventException(
        `Could not acquire aspect from id: ${aspectId}`,
        LogContext.NOTIFICATIONS
      );
    }

    if (!aspect.callout) {
      throw new NotificationEventException(
        `Could not acquire callout from aspect with id: ${aspectId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const community =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        aspect.callout.id
      );

    const hubPayload = await this.buildHubPayload(community);
    const payload: AspectCreatedEventPayload = {
      aspect: {
        id: aspectId,
        createdBy: aspect.createdBy,
        displayName: aspect.displayName,
        type: aspect.type,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  public async buildCalloutPublishedPayload(
    userId: string,
    callout: ICallout
  ): Promise<CalloutPublishedEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    const hubPayload = await this.buildHubPayload(community);
    const payload: CalloutPublishedEventPayload = {
      userID: userId,
      callout: {
        id: callout.id,
        displayName: callout.displayName,
        description: callout.description,
        type: callout.type,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildCommentCreatedOnAspectPayload(
    aspectName: string,
    aspectCreatedBy: string,
    commentsId: string,
    messageResult: CommunicationMessageResult
  ) {
    const community =
      await this.communityResolverService.getCommunityFromCommentsOrFail(
        commentsId
      );

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from comments with id: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }

    const hubPayload = await this.buildHubPayload(community);
    const payload: AspectCommentCreatedEventPayload = {
      aspect: {
        displayName: aspectName,
        createdBy: aspectCreatedBy,
      },
      comment: {
        message: messageResult.message,
        createdBy: messageResult.sender,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildCommunityNewMemberPayload(userID: string, community: ICommunity) {
    const hubPayload = await this.buildHubPayload(community);
    const payload = {
      userID,
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildCollaborationInterestPayload(
    userID: string,
    collaboration: ICollaboration,
    relation: IRelation
  ): Promise<CommunityCollaborationInterestEventPayload> {
    const community =
      await this.communityResolverService.getCommunityFromCollaborationOrFail(
        collaboration.id
      );
    const hubPayload = await this.buildHubPayload(community);
    const payload: CommunityCollaborationInterestEventPayload = {
      userID,
      community: {
        id: community.id,
        name: community.displayName,
        type: community.type,
      },
      relation: {
        role: relation.actorRole || '',
        description: relation.description || '',
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildCommunicationUpdateSentNotificationPayload(
    updateCreatorId: string,
    updates: IUpdates
  ) {
    const community =
      await this.communityResolverService.getCommunityFromUpdatesOrFail(
        updates.id
      );

    const hubPayload = await this.buildHubPayload(community);
    const payload: any = {
      update: {
        id: updates.id,
        createdBy: updateCreatorId,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  async buildUserRegisteredNotificationPayload(userID: string) {
    return { userID: userID };
  }

  async buildCommunityContextReviewSubmittedNotificationPayload(
    userId: string,
    communityId: string,
    challengeId: string,
    questions: CreateNVPInput[]
  ) {
    const community = await this.communityResolverService.getCommunity(
      communityId
    );
    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community with id: ${communityId}`,
        LogContext.COMMUNITY
      );
    }

    return {
      userId,
      challengeId,
      community: {
        name: community.displayName,
      },
      questions,
    };
  }

  async buildCommunicationDiscussionCreatedNotificationPayload(
    discussion: IDiscussion
  ) {
    const community =
      await this.communityResolverService.getCommunityFromDiscussionOrFail(
        discussion.id
      );

    const hubPayload = await this.buildHubPayload(community);
    const payload: any = {
      discussion: {
        id: discussion.id,
        createdBy: discussion.createdBy,
        title: discussion.title,
        description: discussion.description,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: hubPayload,
    };

    return payload;
  }

  private async buildHubPayload(community: ICommunity): Promise<HubPayload> {
    const result: HubPayload = {
      id: community.hubID,
      nameID: await this.getHubNameIdOrFail(community.hubID),
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
