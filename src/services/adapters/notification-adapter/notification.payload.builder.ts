import { LogContext } from '@common/enums';
import { CommunityType } from '@common/enums/community.type';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { IUpdates } from '@domain/communication/updates/updates.interface';
import { Community, ICommunity } from '@domain/community/community';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getConnection, Repository } from 'typeorm';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';
import { Aspect } from '@src/domain/collaboration/aspect/aspect.entity';
import {
  AspectCreatedEventPayload,
  AspectCommentCreatedEventPayload,
  CommunityCollaborationInterestEventPayload,
  CalloutPublishedEventPayload,
} from './event-payloads';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { HubPayload } from './event-payloads/hub.payload';
import { IMessage } from '@domain/communication/message/message.interface';

@Injectable()
export class NotificationPayloadBuilder {
  constructor(
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(Communication)
    private communicationRepository: Repository<Communication>,
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

    const community = await this.getCommunityFromCallout(aspect.callout.id);

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from Callout with id: ${aspect.callout.id}`,
        LogContext.NOTIFICATIONS
      );
    }

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
    const community = await this.getCommunityFromCallout(callout.id);

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from Callout with id: ${callout.id}`,
        LogContext.NOTIFICATIONS
      );
    }

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
    messageResult: IMessage
  ) {
    const community = await this.getCommunityFromComments(commentsId);

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

  async getCommunityFromCollaboration(
    collaborationID: string
  ): Promise<ICommunity> {
    const [result]: {
      communityId: string;
    }[] = await getConnection().query(
      `
        SELECT communityId from \`hub\`
        WHERE \`hub\`.\`collaborationId\` = '${collaborationID}' UNION
        SELECT communityId from \`challenge\`
        WHERE \`challenge\`.\`collaborationId\` = '${collaborationID}' UNION
        SELECT communityId from \`opportunity\`
        WHERE \`opportunity\`.\`collaborationId\` = '${collaborationID}';
      `
    );

    const communityId = result.communityId;
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
    });
    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community for Collaboration: ${collaborationID}`,
        LogContext.NOTIFICATIONS
      );
    }
    return community;
  }

  async buildCollaborationInterestPayload(
    userID: string,
    collaboration: ICollaboration,
    relation: IRelation
  ): Promise<CommunityCollaborationInterestEventPayload> {
    const community = await this.getCommunityFromCollaboration(
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
    const community = await this.getCommunityFromUpdates(updates.id);
    if (!community)
      throw new NotificationEventException(
        `Could not acquire community from updates with id: ${updates.id}`,
        LogContext.COMMUNICATION
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
    const community = await this.getCommunity(communityId);
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
    const community = await this.getCommunityFromDiscussion(discussion.id);
    if (!community)
      throw new NotificationEventException(
        `Could not acquire community from discussion with id: ${discussion.id}`,
        LogContext.COMMUNICATION
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
      const communityWithParent = await this.getCommunityWithParent(
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

  private async getCommunity(communityID: string) {
    return await this.communityRepository
      .createQueryBuilder('community')
      .where('community.id = :id')
      .setParameters({ id: communityID })
      .getOne();
  }

  private async getCommunityWithParent(
    communityID: string
  ): Promise<ICommunity | undefined> {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.parentCommunity', 'parentCommunity')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    return community;
  }

  private async getCommunityFromCallout(calloutId: string) {
    const [result]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await getConnection().query(
      `
        SELECT \`hub\`.\`id\` as \`hubId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`hub\` on \`callout\`.\`collaborationId\` = \`hub\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`challenge\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}' UNION

        SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`callout\`
        RIGHT JOIN \`opportunity\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
        WHERE \`callout\`.\`id\` = '${calloutId}';
      `
    );

    return await this.communityRepository.findOne({
      id: result.communityId,
    });
  }

  private async getCommunityFromComments(commentsId: string) {
    const [queryResult]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await getConnection().query(
      `
      SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`communityType\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`hub\`.\`id\` as \`entityId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`hub\` on \`hub\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`opportunity\`.\`id\` as \`entityId\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`communityType\`  FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`aspect\` on \`callout\`.\`id\` = \`aspect\`.\`calloutId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}';
      `
    );

    return await this.communityRepository.findOne({
      id: queryResult.communityId,
    });
  }

  private async getCommunityFromDiscussion(
    discussionID: string
  ): Promise<ICommunity | undefined> {
    const discussion = await this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.communication', 'communication')
      .where('discussion.id = :id')
      .setParameters({ id: `${discussionID}` })
      .getOne();

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('communicationId = :id')
      .setParameters({ id: `${discussion?.communication?.id}` })
      .getOne();

    return community;
  }

  private async getCommunityFromUpdates(
    updatesID: string
  ): Promise<ICommunity | undefined> {
    const communication = await this.communicationRepository
      .createQueryBuilder('communication')
      .leftJoinAndSelect('communication.updates', 'updates')
      .where('updates.id = :id')
      .setParameters({ id: `${updatesID}` })
      .getOne();

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .where('communicationId = :id')
      .setParameters({ id: `${communication?.id}` })
      .getOne();

    return community;
  }
}
