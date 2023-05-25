import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { LogContext } from '@common/enums';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CalendarEvent, ICalendarEvent } from '@domain/timeline/event';
import { Collaboration } from '@domain/collaboration/collaboration';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(InnovationHub)
    private innovationHubRepository: Repository<InnovationHub>,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async isNameIdAvailableInHub(
    nameID: string,
    hubID: string
  ): Promise<boolean> {
    if (!nameID) return true;

    const challengeCount = await this.challengeRepository.countBy({
      nameID: nameID,
      hubID: hubID,
    });
    if (challengeCount > 0) return false;
    const opportunityCount = await this.opportunityRepository.countBy({
      nameID: nameID,
      hubID: hubID,
    });
    if (opportunityCount > 0) return false;
    const projectCount = await this.projectRepository.countBy({
      nameID: nameID,
      hubID: hubID,
    });
    if (projectCount > 0) return false;
    return true;
  }

  async isAspectNameIdAvailableInCallout(
    nameID: string,
    calloutID: string
  ): Promise<boolean> {
    const query = this.aspectRepository
      .createQueryBuilder('aspect')
      .leftJoinAndSelect('aspect.callout', 'callout')
      .where('callout.id = :id')
      .andWhere('aspect.nameID= :nameID')
      .setParameters({ id: `${calloutID}`, nameID: `${nameID}` });
    const aspectWithNameID = await query.getOne();
    if (aspectWithNameID) {
      return false;
    }

    return true;
  }

  async isCanvasNameIdAvailableInCallout(
    nameID: string,
    calloutID: string
  ): Promise<boolean> {
    const query = this.canvasRepository
      .createQueryBuilder('canvas')
      .leftJoinAndSelect('canvas.callout', 'callout')
      .where('callout.id = :id')
      .andWhere('canvas.nameID= :nameID')
      .setParameters({ id: `${calloutID}`, nameID: `${nameID}` });
    const canvasWithNameID = await query.getOne();
    if (canvasWithNameID) {
      return false;
    }

    return true;
  }

  async isCalloutNameIdAvailableInCollaboration(
    nameID: string,
    collaborationID: string
  ): Promise<boolean> {
    const query = this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .where('collaboration.id = :id')
      .andWhere('callout.nameID= :nameID')
      .setParameters({ id: `${collaborationID}`, nameID: `${nameID}` });
    const calloutsWithNameID = await query.getOne();
    if (calloutsWithNameID) {
      return false;
    }

    return true;
  }

  async isCalloutDisplayNameAvailableInCollaboration(
    displayName: string,
    collaborationID: string
  ): Promise<boolean> {
    const query = this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .leftJoinAndSelect('callout.profile', 'profile')
      .where('collaboration.id = :id')
      .andWhere('profile.displayName = :displayName')
      .setParameters({
        id: `${collaborationID}`,
        displayName: `${displayName}`,
      });
    const calloutsWithDisplayName = await query.getOne();
    if (calloutsWithDisplayName) {
      return false;
    }

    return true;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Callout with ID: ${calloutID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  async isDiscussionDisplayNameAvailableInCommunication(
    displayName: string,
    communicationID: string
  ): Promise<boolean> {
    const query = this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.communication', 'communication')
      .leftJoinAndSelect('discussion.profile', 'profile')
      .where('communication.id = :id')
      .andWhere('profile.displayName = :displayName')
      .setParameters({
        id: `${communicationID}`,
        displayName: `${displayName}`,
      });
    const discussionsWithDisplayName = await query.getOne();
    if (discussionsWithDisplayName) {
      return false;
    }

    return true;
  }

  async isInnovationHubSubdomainAvailable(subdomain: string): Promise<boolean> {
    const innovationHubsCount = await this.innovationHubRepository.countBy({
      subdomain: subdomain,
    });
    if (innovationHubsCount > 0) return false;
    return true;
  }

  async isInnovationHubNameIdAvailable(nameID: string): Promise<boolean> {
    const innovationHubsCount = await this.innovationHubRepository.countBy({
      nameID: nameID,
    });
    if (innovationHubsCount > 0) return false;
    return true;
  }

  async isInnovationHubDisplayNameAvailable(
    displayName: string
  ): Promise<boolean> {
    const query = this.innovationHubRepository
      .createQueryBuilder('innovationHub')
      .leftJoinAndSelect('innovationHub.profile', 'profile')
      .where('profile.displayName = :displayName')
      .setParameters({
        displayName: `${displayName}`,
      });
    const innovationHubsWithDisplayName = await query.getOne();
    if (innovationHubsWithDisplayName) {
      return false;
    }

    return true;
  }

  isValidNameID(nameID: string): boolean {
    if (nameID.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(nameID);
  }

  isValidUUID(uuid: string): boolean {
    if (uuid.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(uuid);
  }

  async getCommunityIdFromCollaborationId(collaborationID: string) {
    const [result]: {
      communityId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT communityId from \`hub\`
        WHERE \`hub\`.\`collaborationId\` = '${collaborationID}' UNION

        SELECT communityId from \`challenge\`
        WHERE \`challenge\`.\`collaborationId\` = '${collaborationID}' UNION

        SELECT communityId from \`opportunity\`
        WHERE \`opportunity\`.\`collaborationId\` = '${collaborationID}';
      `
    );
    return result.communityId;
  }

  createNameID(base: string, useRandomSuffix = true): string {
    const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
    let randomSuffix = '';
    if (useRandomSuffix) {
      const randomNumber = Math.floor(Math.random() * 10000).toString();
      randomSuffix = `-${randomNumber}`;
    }
    const baseMaxLength = base.slice(0, 20);
    // replace spaces + trim to 25 characters
    const nameID = `${baseMaxLength}${randomSuffix}`.replace(/\s/g, '');
    // replace characters with umlouts etc to normal characters
    const nameIDNoSpecialCharacters: string =
      this.replaceSpecialCharacters(nameID);
    // Remove any characters that are not allowed
    return nameIDNoSpecialCharacters
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase()
      .slice(0, 25);
  }

  async getCommunityPolicyForCollaboration(
    collaborationID: string
  ): Promise<ICommunityPolicy> {
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.policy', 'policy')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (!community || !community.policy)
      throw new EntityNotInitializedException(
        `Unable to load policy for community ${communityID} not initialized!`,
        LogContext.COMMUNITY
      );

    return community.policy;
  }

  async getCommunityPolicyForCallout(
    calloutID: string
  ): Promise<ICommunityPolicy> {
    const collaborationID = await this.getCollaborationIdForCallout(calloutID);
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );

    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.policy', 'policy')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (!community || !community.policy)
      throw new EntityNotInitializedException(
        `Unable to load policy for community ${communityID} not initialized!`,
        LogContext.COMMUNITY
      );

    return community.policy;
  }

  async getAspectForComments(commentsID: string): Promise<IAspect | null> {
    // check if this is a comment related to an aspect

    return await this.entityManager.findOne(Aspect, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile'],
    });
  }

  async getCalendarEventForComments(
    commentsID: string
  ): Promise<ICalendarEvent | null> {
    // check if this is a comment related to an calendar
    return await this.entityManager.findOne(CalendarEvent, {
      where: {
        comments: { id: commentsID },
      },
      relations: ['profile', 'comments'],
    });
  }
}
