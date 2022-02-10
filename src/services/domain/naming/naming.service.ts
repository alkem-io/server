import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

export class NamingService {
  replaceSpecialCharacters = require('replace-special-characters');

  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async isNameIdAvailableInEcoverse(
    nameID: string,
    ecoverseID: string
  ): Promise<boolean> {
    const challengeCount = await this.challengeRepository.count({
      nameID: nameID,
      ecoverseID: ecoverseID,
    });
    if (challengeCount > 0) return false;
    const opportunityCount = await this.opportunityRepository.count({
      nameID: nameID,
      ecoverseID: ecoverseID,
    });
    if (opportunityCount > 0) return false;
    const projectCount = await this.projectRepository.count({
      nameID: nameID,
      ecoverseID: ecoverseID,
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

  isValidNameID(nameID: string): boolean {
    if (nameID.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(nameID);
  }

  isValidUUID(uuid: string): boolean {
    if (uuid.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(uuid);
  }

  async getCommunicationGroupIdForContext(contextID: string): Promise<string> {
    const ecoverse = await this.ecoverseRepository
      .createQueryBuilder('ecoverse')
      .leftJoinAndSelect('ecoverse.community', 'community')
      .leftJoinAndSelect('ecoverse.context', 'context')
      .leftJoinAndSelect('community.communication', 'communication')
      .where('context.id = :id')
      .setParameters({ id: `${contextID}` })
      .getOne();
    if (ecoverse) {
      const communicationGroupID =
        ecoverse.community?.communication?.communicationGroupID;
      return communicationGroupID || '';
    }
    // not on an ecoverse, try challenge
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
    const nameIDExcludedCharacters = /[^a-zA-Z0-9/-]/g;
    let randomSuffix = '';
    if (useRandomSuffix) {
      const randomNumber = Math.floor(Math.random() * 10000).toString();
      randomSuffix = `-${randomNumber}`;
    }
    const baseMaxLength = base.slice(0, 20);
    // replace spaces + trim to 25 characters
    const nameID = `${baseMaxLength}${randomSuffix}`.replace(/\s/g, '');
    // replace characters with umlouts etc to normal characters
    const nameIDNoSpecialCharacters = this.replaceSpecialCharacters(nameID);
    // Remove any characters that are not allowed
    return nameIDNoSpecialCharacters
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase()
      .slice(0, 25);
  }
}
