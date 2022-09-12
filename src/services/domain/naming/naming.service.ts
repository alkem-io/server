import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getConnection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { EntityNotInitializedException } from '@common/exceptions';

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
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async isNameIdAvailableInHub(
    nameID: string,
    hubID: string
  ): Promise<boolean> {
    const challengeCount = await this.challengeRepository.count({
      nameID: nameID,
      hubID: hubID,
    });
    if (challengeCount > 0) return false;
    const opportunityCount = await this.opportunityRepository.count({
      nameID: nameID,
      hubID: hubID,
    });
    if (opportunityCount > 0) return false;
    const projectCount = await this.projectRepository.count({
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
      .where('collaboration.id = :id')
      .andWhere('callout.displayName = :displayName')
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

  isValidNameID(nameID: string): boolean {
    if (nameID.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(nameID);
  }

  isValidUUID(uuid: string): boolean {
    if (uuid.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(uuid);
  }

  async getCommunicationGroupIdFromCollaborationId(
    collaborationID: string
  ): Promise<string> {
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );
    return await this.getCommunicationGroupIdFromCommunityId(communityID);
  }

  async getCommunityIdFromCollaborationId(collaborationID: string) {
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
    return result.communityId;
  }

  async getCommunicationGroupIdFromCommunityId(
    communicationID: string
  ): Promise<string> {
    const community = await this.communityRepository
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.communication', 'communication')
      .where('community.id = :id')
      .setParameters({ id: `${communicationID}` })
      .getOne();
    if (!community || !community.communication) {
      throw new EntityNotInitializedException(
        `Unable to identify Community for collaboration ${communicationID}!`,
        LogContext.COMMUNITY
      );
    }
    return community.communication.communicationGroupID;
  }

  async getCommunicationGroupIdForCallout(calloutID: string): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.community', 'community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('hub.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (hub) {
      const communicationGroupID =
        hub.community?.communication?.communicationGroupID;
      return communicationGroupID || '';
    }
    // not on an hub, try challenge
    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.community', 'community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('challenge.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (challenge) {
      const communicationGroupID =
        challenge.community?.communication?.communicationGroupID;
      return communicationGroupID || '';
    }

    // and finally try on opportunity
    const opportunity = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.community', 'community')
      .leftJoinAndSelect('community.communication', 'communication')
      .leftJoinAndSelect('opportunity.collaboration', 'collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (opportunity) {
      const communicationGroupID =
        opportunity.community?.communication?.communicationGroupID;
      return communicationGroupID || '';
    }

    throw new RelationshipNotFoundException(
      `Unable to find the communication ID for the provided callout: ${calloutID}`,
      LogContext.CONTEXT
    );
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

  async getMembershipCredentialForCollaboration(
    collaborationID: string
  ): Promise<ICredentialDefinition> {
    const communityID = await this.getCommunityIdFromCollaborationId(
      collaborationID
    );

    const community = await this.communityRepository.findOne({
      id: communityID,
    });

    if (!community)
      throw new EntityNotInitializedException(
        `Community for collaboration ${collaborationID} not initialized!`,
        LogContext.COMMUNITY
      );

    const communityPolicy: ICommunityPolicy = JSON.parse(community.policy);

    return communityPolicy.member.credential;
  }
}
