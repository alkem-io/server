import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { Context } from '@domain/context/context/context.entity';
import { ContextService } from '@domain/context/context/context.service';
import { CreateOrganisationInput } from '@domain/community/organisation/organisation.dto.create';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IUser } from '@domain/community/user/user.interface';
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
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { AuthorizationRoles } from '@core/authorization';
import { CommunityType } from '@common/enums/community.types';
import { IOpportunity } from '@domain/challenge/opportunity';

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
    ecoverseData.textID = ecoverseData.textID.toLowerCase();
    const ecoverse = Ecoverse.create(ecoverseData);
    await this.initialiseMembers(ecoverse);
    return await this.ecoverseRepository.save(ecoverse);
  }

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(ecoverse: IEcoverse): Promise<IEcoverse> {
    if (!ecoverse.challenges) {
      ecoverse.challenges = [];
    }

    if (!ecoverse.organisations) {
      ecoverse.organisations = [];
    }

    if (!ecoverse.tagset) {
      ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
      await this.tagsetService.initialiseMembers(ecoverse.tagset);
    }

    if (!ecoverse.context) {
      ecoverse.context = new Context();
      await this.contextService.initialiseMembers(ecoverse.context);
    }

    if (!ecoverse.community) {
      let communityName = ecoverse.name;
      if (communityName.length == 0) communityName = 'Ecoverse';
      ecoverse.community = new Community(
        communityName,
        CommunityType.ECOVERSE,
        [
          AuthorizationRoles.Members,
          AuthorizationRoles.EcoverseAdmins,
          AuthorizationRoles.GlobalAdmins,
          AuthorizationRoles.CommunityAdmins,
        ]
      );

      await this.communityService.initialiseMembers(ecoverse.community);
      // Disable searching on the mandatory platform groups
      ecoverse.community.groups?.forEach(
        group => (group.includeInSearch = false)
      );
    }

    if (!ecoverse.host) {
      const organisationInput = new CreateOrganisationInput();
      organisationInput.name = `Default host - ${ecoverse.textID}`;
      organisationInput.textID = `HostOrg_${ecoverse.textID}`;
      ecoverse.host = await this.organisationService.createOrganisation(
        organisationInput
      );
    }

    return ecoverse;
  }

  async getEcoverseOrFail(
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
    const ecoverseWithChallenges = await this.getEcoverseOrFail(ecoverse.id, {
      relations: ['challenges'],
    });
    return ecoverseWithChallenges.challenges || [];
  }

  async getOpportunities(ecoverse: IEcoverse): Promise<IOpportunity[]> {
    const opportunities: IOpportunity[] = [];
    const challenges = await this.getChallenges(ecoverse);
    for (let i = 0; i < challenges.length; i++) {
      const challenge = challenges[i];
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
    const ecoverse = await this.getEcoverseOrFail(ecoverseId, {
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
    const ecoverse = await this.getEcoverseOrFail(challengeData.parentID, {
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

  async addEcoverseAdmin(ecoverse: IEcoverse, user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      ecoverse,
      user,
      AuthorizationRoles.EcoverseAdmins
    );
  }

  async addGlobalAdmin(ecoverse: IEcoverse, user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      ecoverse,
      user,
      AuthorizationRoles.GlobalAdmins
    );
  }

  async addCommunityAdmin(ecoverse: IEcoverse, user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      ecoverse,
      user,
      AuthorizationRoles.CommunityAdmins
    );
  }

  async addUserToRestrictedGroup(
    ecoverse: IEcoverse,
    user: IUser,
    groupName: string
  ): Promise<boolean> {
    const community = await this.getCommunity(ecoverse.id);

    return await this.communityService.addUserToRestrictedGroup(
      community.id,
      user,
      groupName
    );
  }

  async update(ecoverseData: UpdateEcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getDefaultEcoverseOrFail();

    // Copy over the received data
    if (ecoverseData.name) {
      ecoverse.name = ecoverseData.name;
    }

    if (ecoverseData.context) {
      if (!ecoverse.context) {
        ecoverse.context = new Context();
      }
      await this.contextService.update(ecoverse.context, ecoverseData.context);
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
    return await this.getEcoverseOrFail(ecoverseId, options);
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
