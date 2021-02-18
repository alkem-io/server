import { ApplicationInput } from '@domain/application/application.dto';
import { Application } from '@domain/application/application.entity';
import { ApplicationFactoryService } from '@domain/application/application.factory';
import { ChallengeInput } from '@domain/challenge/challenge.dto';
import { IChallenge } from '@domain/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge.service';
import { Context } from '@domain/context/context.entity';
import { IContext } from '@domain/context/context.interface';
import { ContextService } from '@domain/context/context.service';
import { OrganisationInput } from '@domain/organisation/organisation.dto';
import { Organisation } from '@domain/organisation/organisation.entity';
import { IOrganisation } from '@domain/organisation/organisation.interface';
import { OrganisationService } from '@domain/organisation/organisation.service';
import { RestrictedTagsetNames, Tagset } from '@domain/tagset/tagset.entity';
import { ITagset } from '@domain/tagset/tagset.interface';
import { TagsetService } from '@domain/tagset/tagset.service';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { IUser } from '@domain/user/user.interface';
import { UserService } from '@domain/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EcoverseInput } from './ecoverse.dto';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private challengeService: ChallengeService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    private applicationFactoryService: ApplicationFactoryService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(ecoverse: IEcoverse): Promise<IEcoverse> {
    if (!ecoverse.groups) {
      ecoverse.groups = [];
    }

    // Check that the mandatory groups for a challenge are created
    await this.userGroupService.addMandatoryGroups(
      ecoverse,
      ecoverse.restrictedGroupNames
    );
    // Disable searching on the mandatory platform groups
    ecoverse.groups.forEach(group => (group.includeInSearch = false));

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

  async getMembers(): Promise<IUser[]> {
    try {
      const ecoverse = await this.getEcoverse({
        relations: ['groups'],
      });
      const membersGroup = await this.userGroupService.getGroupByName(
        ecoverse,
        RestrictedGroupNames.Members
      );

      return await this.userGroupService.getMembers(membersGroup.id);
    } catch (e) {
      throw e;
    }
  }

  async getGroups(): Promise<IUserGroup[]> {
    try {
      const ecoverse = await this.getEcoverse();
      const groups = await this.userGroupService.getGroups(ecoverse);
      return groups;
    } catch (e) {
      throw e;
    }
  }

  async getGroupsWithTag(tagFilter: string): Promise<IUserGroup[]> {
    const groups = await this.getGroups();
    return groups.filter(g => {
      if (!tagFilter) {
        return true;
      }

      if (!g.profile) return false;

      const tagset = this.tagsetService.defaultTagset(g.profile);

      return (
        tagset !== undefined && this.tagsetService.hasTag(tagset, tagFilter)
      );
    });
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

  async createGroup(groupName: string): Promise<IUserGroup> {
    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to ecoverse`,
      LogContext.CHALLENGES
    );

    const ecoverse = await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          groups: 'ecoverse.groups',
        },
      },
    });

    const group = await this.userGroupService.addGroupWithName(
      ecoverse,
      groupName
    );

    await this.ecoverseRepository.save(ecoverse);

    return group;
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
    if (!(await this.groupIsRestricted(groupName)))
      throw new ValidationException(
        `${groupName} is not a restricted group name!`,
        LogContext.COMMUNITY
      );

    const ctverse = await this.getEcoverse({ relations: ['groups'] });
    const adminsGroup = await this.userGroupService.getGroupByName(
      ctverse,
      groupName
    );

    if (await this.userGroupService.addUserToGroup(user, adminsGroup)) {
      return true;
    }

    return false;
  }

  async groupIsRestricted(groupName: string): Promise<boolean> {
    if (
      [
        RestrictedGroupNames.EcoverseAdmins as string,
        RestrictedGroupNames.CommunityAdmins as string,
        RestrictedGroupNames.GlobalAdmins as string,
        RestrictedGroupNames.Members as string,
      ].includes(groupName)
    )
      return true;
    return false;
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

  async getApplications(): Promise<Application[]> {
    const ecoverse = await this.getEcoverse({
      relations: ['applications'],
    });

    return ecoverse.applications || [];
  }

  async createApplication(applicationData: ApplicationInput) {
    const ecoverse = await this.getEcoverse({
      relations: ['applications'],
    });

    const applications = await this.getApplications();
    const existingApplication = applications.find(
      x => x.user.id === applicationData.userId
    );

    if (existingApplication) {
      throw new ApolloError(
        `An application for user ${
          existingApplication.user.email
        } already exits. Application status: ${existingApplication.status.toString()}`
      );
    }

    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );

    ecoverse.applications?.push(application);
    await this.ecoverseRepository.save(ecoverse);
    return application;
  }

  async addMember(userID: number): Promise<IUserGroup> {
    const user = await this.userService.getUserByIdOrFail(userID);

    const ecoverse = await this.getEcoverse({
      relations: ['groups'],
    });

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }
}
