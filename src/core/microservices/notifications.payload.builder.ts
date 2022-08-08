import { LogContext } from '@common/enums';
import { CommunityType } from '@common/enums/community.type';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Opportunity } from '@domain/collaboration';
import { Communication } from '@domain/communication';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { IUpdates } from '@domain/communication/updates/updates.interface';
import { Community, ICommunity } from '@domain/community/community';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getConnection, Repository } from 'typeorm';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';
import { Aspect } from '@src/domain';
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import {
  AspectCreatedEventPayload,
  AspectCommentCreatedEventPayload,
  CommunityCollaborationInterestEventPayload,
} from './event-payloads';

@Injectable()
export class NotificationsPayloadBuilder {
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
    const payload: any = {
      applicationCreatorID,
      applicantID,
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: {
        nameID: await this.getHubNameID(community.hubID),
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

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
        `Could not acquire community from context with id: ${aspect.callout.id}`,
        LogContext.NOTIFICATIONS
      );
    }

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
      hub: {
        nameID: (await this.getHubNameID(community.hubID)) ?? '',
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

    return payload;
  }

  async buildCommentCreatedOnAspectPayload(
    aspectName: string,
    aspectCreatedBy: string,
    commentsId: string,
    messageResult: CommunicationMessageResult
  ) {
    const community = await this.getCommunityFromComments(commentsId);

    if (!community) {
      throw new NotificationEventException(
        `Could not acquire community from comments with id: ${commentsId}`,
        LogContext.NOTIFICATIONS
      );
    }

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
      hub: {
        nameID: (await this.getHubNameID(community.hubID)) ?? '',
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

    return payload;
  }

  async buildCommunityNewMemberPayload(userID: string, community: ICommunity) {
    const payload = {
      userID,
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: {
        nameID: await this.getHubNameID(community.hubID),
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

    return payload;
  }

  buildCommunityCollaborationInterestPayload(
    userID: string,
    opportunity: IOpportunity
  ): CommunityCollaborationInterestEventPayload {
    const payload = {
      userID,
      opportunity: {
        id: opportunity.id,
        name: opportunity.displayName,
        communityName: opportunity.community?.displayName,
      },
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

    const payload: any = {
      update: {
        id: updates.id,
        createdBy: updateCreatorId,
      },
      community: {
        name: community.displayName,
        type: community.type,
      },
      hub: {
        nameID: await this.getHubNameID(community.hubID),
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

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
      hub: {
        nameID: await this.getHubNameID(community.hubID),
        id: community.hubID,
      },
    };

    await this.buildHubPayload(payload, community);

    return payload;
  }
  private async buildHubPayload(payload: any, community: ICommunity) {
    if (community.type === CommunityType.CHALLENGE) {
      payload.hub.challenge = {
        nameID: await this.getChallengeNameID(community.parentID),
        id: community.parentID,
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

      payload.hub.challenge = {
        nameID: await this.getChallengeNameID(parentCommunity.parentID),
        id: parentCommunity.parentID,
        opportunity: {
          nameID: await this.getOpportunityNameID(community.parentID),
          id: community.parentID,
        },
      };
    }
  }

  private async getHubNameID(hubID: string): Promise<string | undefined> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .where('hub.id = :id')
      .setParameters({ id: `${hubID}` })
      .getOne();

    return hub?.nameID;
  }

  private async getChallengeNameID(
    challengeID: string
  ): Promise<string | undefined> {
    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .where('challenge.id = :id')
      .setParameters({ id: `${challengeID}` })
      .getOne();
    return challenge?.nameID;
  }

  private async getOpportunityNameID(
    opportunityID: string
  ): Promise<string | undefined> {
    const opportunity = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.id = :id')
      .setParameters({ id: `${opportunityID}` })
      .getOne();

    return opportunity?.nameID;
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
    let communityId = '';
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.community', 'community')
      .leftJoinAndSelect('hub.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutId}` })
      .getOne();
    if (hub) {
      communityId = hub.community?.id || '';
    }
    // not on an hub, try challenge
    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.community', 'community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('challenge.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutId}` })
      .getOne();
    if (challenge) {
      communityId = challenge.community?.id || '';
    }

    // and finally try on opportunity
    const opportunity = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.community', 'community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('opportunity.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutId}` })
      .getOne();
    if (opportunity) {
      communityId = opportunity.community?.id || '';
    }
    // const [result]: {
    //   entityId: string;
    //   communityId: string;
    //   communityType: string;
    // }[] = await getConnection().query(
    //   `
    //     SELECT \`hub\`.\`id\` as \`hubId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`hub\`
    //     RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`hub\`.\`collaborationId\`
    //     RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //     WHERE \`aspect\`.\`calloutId\` = '${calloutId}' UNION

    //     SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`challenge\`
    //     RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
    //     RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //     WHERE \`aspect\`.\`calloutId\` = '${calloutId}' UNION

    //     SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`opportunity\`
    //     RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
    //     RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //     WHERE \`aspect\`.\`calloutId\` = '${calloutId}';
    //   `
    //   // `
    //   //   SELECT \`hub\`.\`id\` as \`hubId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`hub\`
    //   //   RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`hub\`.\`collaborationId\`
    //   //   RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //   //   WHERE \`aspect\`.\`calloutId\` = '${calloutId}' UNION

    //   //   SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`challenge\`
    //   //   RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`challenge\`.\`collaborationId\`
    //   //   RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //   //   WHERE \`aspect\`.\`calloutId\` = '${calloutId}' UNION

    //   //   SELECT \`opportunity\`.\`id\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`opportunity\`
    //   //   RIGHT JOIN \`callout\` on \`callout\`.\`collaborationId\` = \`opportunity\`.\`collaborationId\`
    //   //   RIGHT JOIN \`aspect\` on \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
    //   //   WHERE \`aspect\`.\`calloutId\` = '${calloutId}';
    //   // `
    // );

    return await this.communityRepository.findOne({
      id: communityId,
    });
  }

  private async getCommunityFromComments(commentsId: string) {
    const [result]: {
      entityId: string;
      communityId: string;
      communityType: string;
    }[] = await getConnection().query(
      `
      SELECT \`challenge\`.\`id\` as \`entityId\`, \`challenge\`.\`communityId\` as communityId, 'challenge' as \`entityType\` FROM \`aspect\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`aspect\`.\`collaborationId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`hub\`.\`id\` as \`entityId\`, \`hub\`.\`communityId\` as communityId, 'hub' as \`entityType\` FROM \`aspect\`
      RIGHT JOIN \`hub\` on \`hub\`.\`collaborationId\` = \`aspect\`.\`collaborationId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}' UNION

      SELECT \`opportunity\`.\`id\` as \`entityId\`, \`opportunity\`.\`communityId\` as communityId, 'opportunity' as \`entityType\` FROM \`aspect\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`aspect\`.\`collaborationId\`
      WHERE \`aspect\`.\`commentsId\` = '${commentsId}';
      `
    );

    return await this.communityRepository.findOne({
      id: result.communityId,
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
