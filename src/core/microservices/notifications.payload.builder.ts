import { LogContext } from '@common/enums';
import { CommunityType } from '@common/enums/community.type';
import { EntityNotFoundException } from '@common/exceptions';
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/collaboration';
import { Communication } from '@domain/communication';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { IUpdates } from '@domain/communication/updates/updates.interface';
import { Community, ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationsPayloadBuilder {
  constructor(
    @InjectRepository(Ecoverse)
    private hubRepository: Repository<Ecoverse>,
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
        nameID: await this.getHubNameID(community.ecoverseID),
        id: community.ecoverseID,
      },
    };

    await this.buildHubPayload(payload, community);

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
        nameID: await this.getHubNameID(community.ecoverseID),
        id: community.ecoverseID,
      },
    };

    await this.buildHubPayload(payload, community);

    return payload;
  }

  async buildUserRegisteredNotificationPayload(userID: string) {
    return { userID: userID };
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
        nameID: await this.getHubNameID(community.ecoverseID),
        id: community.ecoverseID,
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
      .createQueryBuilder('ecoverse')
      .where('ecoverse.id = :id')
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
