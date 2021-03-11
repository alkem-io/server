import { ChallengeInput } from '@domain/challenge/challenge/challenge.dto';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { Context } from '@domain/context/context/context.entity';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';
import { OrganisationInput } from '@domain/community/organisation/organisation.dto';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { RestrictedGroupNames } from '@domain/community/user-group/user-group.entity';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EcoverseInput } from './ecoverse.dto';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
import {
  Community,
  CommunityService,
  ICommunity,
} from '@domain/community/community';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private challengeService: ChallengeService,
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    private userGroupService: UserGroupService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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
      ecoverse.community = new Community(ecoverse.name, [
        RestrictedGroupNames.Members,
        RestrictedGroupNames.EcoverseAdmins,
        RestrictedGroupNames.GlobalAdmins,
        RestrictedGroupNames.CommunityAdmins,
      ]);

      this.communityService.initialiseMembers(ecoverse.community);
      // Disable searching on the mandatory platform groups
      ecoverse.community.groups?.forEach(
        group => (group.includeInSearch = false)
      );
    }

    if (!ecoverse.host) {
      ecoverse.host = await this.organisationService.createOrganisation(
        'Default host organisation'
      );
    }

    return ecoverse;
  }

  async getEcoverse(options?: FindOneOptions<Ecoverse>): Promise<IEcoverse> {
    return await this.ecoverseRepository.findOneOrFail(options);
  }

  async getName(): Promise<string> {
    const ecoverse = await this.getEcoverse();
    return ecoverse.name;
  }

  async getEcoverseId(): Promise<number> {
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
  async getChallenges(): Promise<IChallenge[]> {
    const ecoverseId = await this.getEcoverseId();
    const challanges = await this.challengeService.getChallenges(ecoverseId);
    return challanges;
  }

  async getOrganisations(): Promise<IOrganisation[]> {
    try {
      const ecoverse = await this.getEcoverse({
        relations: ['organisations', 'organisations.groups'],
      });

      return ecoverse.organisations || [];
    } catch (e) {
      throw e;
    }
  }

  async getContext(): Promise<IContext> {
    const ecoverse = await this.getEcoverse();
    return ecoverse.context as IContext;
  }

  async getTagset(): Promise<ITagset> {
    const ecoverse: IEcoverse = await this.getEcoverse();
    return ecoverse.tagset as ITagset;
  }

  async getHost(): Promise<IOrganisation> {
    const ecoverse = await this.getEcoverse();
    return ecoverse.host as IOrganisation;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          challenges: 'ecoverse.challenges',
        },
      },
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

    return challenge;
  }

  async createOrganisation(
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          organisations: 'ecoverse.organisations',
        },
      },
    });
    if (!ecoverse.organisations) {
      throw new EntityNotInitializedException(
        'Organisations must be defined',
        LogContext.CHALLENGES
      );
    }

    let organisation = ecoverse.organisations.find(
      o => o.name === organisationData.name
    );
    // First check if the organisation already exists on not...
    if (organisation)
      throw new ValidationException(
        `Organisation with the provided name already exists: ${organisationData.name}`,
        LogContext.CHALLENGES
      );
    // No existing organisation found, create and initialise a new one!
    organisation = await this.organisationService.createOrganisation(
      organisationData.name
    );
    ecoverse.organisations.push(organisation as Organisation);
    await this.ecoverseRepository.save(ecoverse);

    return organisation;
  }

  async addAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.EcoverseAdmins
    );
  }

  async addGlobalAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.GlobalAdmins
    );
  }

  async addCommunityAdmin(user: IUser): Promise<boolean> {
    return await this.addUserToRestrictedGroup(
      user,
      RestrictedGroupNames.CommunityAdmins
    );
  }

  async addUserToRestrictedGroup(
    user: IUser,
    groupName: string
  ): Promise<boolean> {
    const ecoverse = await this.getEcoverse();
    const community = ecoverse.community;
    if (!community) {
      throw new RelationshipNotFoundException(
        `Unable to load community for ecoverse ${ecoverse.id}`,
        LogContext.COMMUNITY
      );
    }
    return await this.communityService.addUserToRestrictedGroup(
      community.id,
      user,
      groupName
    );
  }

  async update(ecoverseData: EcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverse();

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
      await this.tagsetService.replaceTags(
        ecoverse.tagset.id,
        ecoverseData.tags
      );
    }

    await this.ecoverseRepository.save(ecoverse);

    return ecoverse;
  }

  // Loads the challenges into the ecoverse entity if not already present
  async loadCommunity(ecoverseId: number): Promise<ICommunity> {
    const ecoverse = await this.getEcoverse({
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
}
