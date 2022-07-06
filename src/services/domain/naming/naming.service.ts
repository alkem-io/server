import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
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

  async isAspectNameIdAvailableInContext(
    nameID: string,
    contextID: string
  ): Promise<boolean> {
    const query = this.aspectRepository
      .createQueryBuilder('aspect')
      .leftJoinAndSelect('aspect.context', 'context')
      .where('context.id = :id')
      .andWhere('aspect.nameID= :nameID')
      .setParameters({ id: `${contextID}`, nameID: `${nameID}` });
    const aspectWithNameID = await query.getOne();
    if (aspectWithNameID) {
      return false;
    }

    return true;
  }

  async isCanvasNameIdAvailableInContext(
    nameID: string,
    contextID: string
  ): Promise<boolean> {
    const query = this.aspectRepository
      .createQueryBuilder('canvas')
      .leftJoinAndSelect('canvas.context', 'context')
      .where('context.id = :id')
      .andWhere('canvas.nameID= :nameID')
      .setParameters({ id: `${contextID}`, nameID: `${nameID}` });
    const aspectWithNameID = await query.getOne();
    if (aspectWithNameID) {
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

  async getCommunicationGroupIdForContext(contextID: string): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.community', 'community')
      .leftJoinAndSelect('hub.context', 'context')
      .leftJoinAndSelect('community.communication', 'communication')
      .where('context.id = :id')
      .setParameters({ id: `${contextID}` })
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
      .leftJoinAndSelect('challenge.context', 'context')
      .leftJoinAndSelect('community.communication', 'communication')
      .where('context.id = :id')
      .setParameters({ id: `${contextID}` })
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
      .leftJoinAndSelect('opportunity.context', 'context')
      .leftJoinAndSelect('community.communication', 'communication')
      .where('context.id = :id')
      .setParameters({ id: `${contextID}` })
      .getOne();
    if (opportunity) {
      const communicationGroupID =
        opportunity.community?.communication?.communicationGroupID;
      return communicationGroupID || '';
    }

    throw new RelationshipNotFoundException(
      `Unable to find the communication ID for the provided context: ${contextID}`,
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
}
