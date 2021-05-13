import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { ContextService } from '@domain/context/context/context.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';

import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Ecoverse,
  IEcoverse,
  CreateEcoverseInput,
  UpdateEcoverseInput,
} from '@domain/challenge/ecoverse';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import validator from 'validator';
import { IUserGroup } from '@domain/community/user-group';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private challengeService: ChallengeService,
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createEcoverse(ecoverseData: CreateEcoverseInput): Promise<IEcoverse> {
    const ecoverse: IEcoverse = Ecoverse.create(ecoverseData);
    await this.ecoverseRepository.save(ecoverse);
    ecoverse.challenge = await this.challengeService.createChallenge({
      parentID: ecoverse.id,
      name: `ecoverse-${ecoverseData.name}`,
      context: ecoverseData.context,
      textID: `ecoverse-${ecoverseData.textID}`,
      tags: ecoverseData.tags,
    });

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    } else {
      ecoverse.host = await this.organisationService.createOrganisation({
        name: 'Default host organisation',
        textID: `host-${ecoverseData.textID}`,
      });
    }
    return await this.ecoverseRepository.save(ecoverse);
  }

  async getEcoverseOrFail(
    ecoverseID: string,
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    if (validator.isNumeric(ecoverseID)) {
      const idInt: number = parseInt(ecoverseID);
      return await this.getEcoverseByIdOrFail(idInt, options);
    }

    throw new EntityNotFoundException(
      `Unable to find Ecoverse with ID: ${ecoverseID}`,
      LogContext.CHALLENGES
    );
  }

  async getEcoverseByIdOrFail(
    ecoverseID: number,
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    const ecoverse = await this.ecoverseRepository.findOne(
      { id: ecoverseID },
      options
    );
    if (!ecoverse)
      throw new EntityNotFoundException(
        `Unable to find Ecoverse with ID: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    return ecoverse;
  }

  getChallenge(ecoverse: IEcoverse): IChallenge {
    const challenge = ecoverse.challenge;
    if (!challenge) {
      throw new EntityNotInitializedException(
        `Unable to find Ecoverse with ID: ${ecoverse.id}`,
        LogContext.CHALLENGES
      );
    }
    return challenge;
  }

  async getChallenges(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const challenge = this.getChallenge(ecoverse);
    return await this.challengeService.getChildChallenges(challenge);
  }

  async getGroups(ecoverse: IEcoverse): Promise<IUserGroup[]> {
    const community = await this.getCommunity(ecoverse);
    return community.groups || [];
  }

  // todo: replace with a single getChallenges with a flag for recursive
  async getOpportunities(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const challenges = await this.getChallenges(ecoverse);
    const opportunitiyChallenges: IChallenge[] = [];
    for (const challenge of challenges) {
      const childChallenges = await this.challengeService.getChildChallenges(
        challenge
      );
      childChallenges.forEach(challenge =>
        opportunitiyChallenges.push(challenge)
      );
    }
    return opportunitiyChallenges;
  }

  async getCommunity(ecoverse: IEcoverse): Promise<ICommunity> {
    const challenge = this.getChallenge(ecoverse);
    return await this.challengeService.getCommunity(challenge.id);
  }

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseByIdOrFail(challengeData.parentID);
    const challenges = await this.getChallenges(ecoverse);

    // First check if the challenge already exists on not...
    let newChallenge = challenges.find(c => c.name === challengeData.name);
    if (newChallenge) {
      // already have a challenge with the given name, not allowed
      throw new ValidationException(
        `Unable to create challenge: already have a challenge with the provided name (${challengeData.name})`,
        LogContext.CHALLENGES
      );
    }

    // No existing challenge found, create and initialise a new one!
    newChallenge = await this.challengeService.createChildChallenge(
      challengeData
    );
    await this.ecoverseRepository.save(ecoverse);

    return newChallenge;
  }

  async update(ecoverseData: UpdateEcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverseOrFail(ecoverseData.ID);
    const challenge = this.getChallenge(ecoverse);

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    }

    ecoverse.challenge = await this.challengeService.updateChallenge({
      ID: challenge.id.toString(),
      name: ecoverseData.name,
      context: ecoverseData.context,
      tags: ecoverseData.tags,
    });

    return await this.ecoverseRepository.save(ecoverse);
  }

  async getDefaultEcoverseOrFail(
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    const ecoverseId = await this.getDefaultEcoverseId(); // todo - remove when can have multiple ecoverses
    return await this.getEcoverseByIdOrFail(ecoverseId, options);
  }

  async getDefaultEcoverseId(): Promise<number> {
    const ecoverse = await this.ecoverseRepository
      .createQueryBuilder('ecoverse')
      .select('ecoverse.id')
      .getOne(); // TODO [ATS] Replace with getOneOrFail when it is released. https://github.com/typeorm/typeorm/blob/06903d1c914e8082620dbf16551caa302862d328/src/query-builder/SelectQueryBuilder.ts#L1112

    if (!ecoverse) {
      throw new ValidationException(
        'Ecoverse is missing!',
        LogContext.BOOTSTRAP
      );
    }
    return ecoverse.id;
  }
}
