import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge';
import { Opportunity } from '@domain/collaboration/opportunity';
import { Project } from '@domain/collaboration/project';
import { NameID, UUID } from '@domain/common/scalars';

export class NamingService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
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

  isValidNameID(nameID: string): boolean {
    if (nameID.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(nameID);
  }

  isValidUUID(uuid: string): boolean {
    if (uuid.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(uuid);
  }
}
