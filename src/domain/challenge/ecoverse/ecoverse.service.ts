import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { Context } from '@domain/context/context/context.entity';
import { ContextService } from '@domain/context/context/context.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
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
import { CommunityType } from '@common/enums/community.types';
import { IOpportunity } from '@domain/challenge/opportunity';
import validator from 'validator';

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
    if (!ecoverse.challenges) {
      ecoverse.challenges = [];
    }

    if (!ecoverse.organisations) {
      ecoverse.organisations = [];
    }

    if (!ecoverse.tagset) {
      ecoverse.tagset = await this.tagsetService.createTagset({
        name: RestrictedTagsetNames.Default,
      });
    }

    if (!ecoverse.context) {
      ecoverse.context = await this.contextService.createContext({});
    }

    ecoverse.community = await this.communityService.createCommunity(
      ecoverse.name,
      CommunityType.ECOVERSE
    );

    // Disable searching on the mandatory platform groups
    ecoverse.community.groups?.forEach(
      group => (group.includeInSearch = false)
    );

    if (!ecoverse.host) {
      ecoverse.host = await this.organisationService.createOrganisation({
        name: 'Default host organisation',
        textID: 'DefaultHostOrg',
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

  async getChallenges(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const ecoverseWithChallenges = await this.getEcoverseByIdOrFail(
      ecoverse.id,
      {
        relations: ['challenges'],
      }
    );
    return ecoverseWithChallenges.challenges || [];
  }

  async getOpportunities(ecoverse: IEcoverse): Promise<IOpportunity[]> {
    const opportunities: IOpportunity[] = [];
    const challenges = await this.getChallenges(ecoverse);
    for (const challenge of challenges) {
      const childOpportunities = await this.challengeService.getOpportunities(
        challenge
      );
      childOpportunities.forEach(opportunity =>
        opportunities.push(opportunity)
      );
    }
    return opportunities;
  }

  async getCommunity(ecoverseId: number): Promise<ICommunity> {
    const ecoverse = await this.getEcoverseByIdOrFail(ecoverseId, {
      relations: ['community'],
    });
    const community = ecoverse.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for ecoverse ${ecoverseId}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseByIdOrFail(challengeData.parentID, {
      relations: ['challenges', 'community'],
    });

    if (!ecoverse.challenges) {
      throw new EntityNotInitializedException(
        'Challenges must be defined',
        LogContext.CHALLENGES
      );
    }
    // First check if the challenge already exists on not...
    let challenge = ecoverse.challenges.find(
      c => c.name === challengeData.name
    );
    if (challenge) {
      // already have a challenge with the given name, not allowed
      throw new ValidationException(
        `Unable to create challenge: already have a challenge with the provided name (${challengeData.name})`,
        LogContext.CHALLENGES
      );
    }
    // No existing challenge found, create and initialise a new one!
    challenge = await this.challengeService.createChallenge(challengeData);

    ecoverse.challenges.push(challenge);
    await this.ecoverseRepository.save(ecoverse);

    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      challenge.community,
      ecoverse.community
    );

    return challenge;
  }

  async update(ecoverseData: UpdateEcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverseOrFail(ecoverseData.ID);

    // Copy over the received data
    if (ecoverseData.name) {
      ecoverse.name = ecoverseData.name;
    }

    if (ecoverseData.context) {
      if (!ecoverse.context) {
        ecoverse.context = new Context();
      }
      ecoverse.context = await this.contextService.updateContext(
        ecoverse.context,
        ecoverseData.context
      );
    }

    if (ecoverseData.tags) {
      if (!ecoverse.tagset) {
        ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
      }
      await this.tagsetService.replaceTagsOnEntity(
        ecoverse as Ecoverse,
        ecoverseData.tags
      );
    }

    if (ecoverseData.hostID) {
      const organisation = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
      ecoverse.host = organisation;
    }

    await this.ecoverseRepository.save(ecoverse);

    return ecoverse;
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
