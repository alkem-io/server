import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IContext } from '@domain/context/context.interface';
import { IOrganisation } from '@domain/organisation/organisation.interface';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { FindOneOptions, Repository } from 'typeorm';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
import { ContextService } from '@domain/context/context.service';
import { EcoverseInput } from './ecoverse.dto';
import { TagsetService } from '@domain/tagset/tagset.service';
import { IUser } from '@domain/user/user.interface';
import { IChallenge } from '@domain/challenge/challenge.interface';
import { ITagset } from '@domain/tagset/tagset.interface';
import { ChallengeService } from '@domain/challenge/challenge.service';
import { ChallengeInput } from '@domain/challenge/challenge.dto';
import { UserInput } from '@domain/user/user.dto';
import { OrganisationInput } from '@domain/organisation/organisation.dto';
import { Organisation } from '@domain/organisation/organisation.entity';
import { Context } from '@domain/context/context.entity';
import { RestrictedTagsetNames, Tagset } from '@domain/tagset/tagset.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OrganisationService } from '@domain/organisation/organisation.service';
import { UserService } from '@domain/user/user.service';
import { AccountService } from '@utils/account/account.service';
import { LogContext } from '@utils/logging/logging.contexts';
import {
  ValidationException,
  EntityNotInitializedException,
  AccountException,
} from '@utils/error-handling/exceptions';
import { CherrytwistErrorStatus } from '@utils/error-handling/enums/cherrytwist.error.status';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private userService: UserService,
    private challengeService: ChallengeService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    private accountService: AccountService,
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

  async getUsers(): Promise<IUser[]> {
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

  // Create the user and an account on the identity provider
  async createUser(userData: UserInput): Promise<IUser> {
    // Check that a valid profile and a valid account can be created. It is double work but not easily avoided.
    await this.userService.validateUserProfileCreationRequest(userData);
    if (this.accountService.authenticationEnabled()) {
      await this.accountService.validateAccountCreationRequest(userData);
    }

    // Ok to proceed to creating profile and optionally account
    const user = await this.createUserProfile(userData);
    if (this.accountService.authenticationEnabled()) {
      const result = await this.accountService.createUserAccount(userData);
      if (!result) {
        await this.userService.removeUser(user);
        throw new AccountException(
          'Unable to create account for user!',
          LogContext.COMMUNITY,
          CherrytwistErrorStatus.ACCOUNT_CREATION_FAILED
        );
      }
    }
    return user;
  }

  // Create the user and add the user into the members group
  async createUserProfile(userData: UserInput): Promise<IUser> {
    const ctUser = await this.userService.createUser(userData);
    if (!ctUser)
      throw new ValidationException(
        `User ${userData.email} could not be created!`,
        LogContext.COMMUNITY
      );

    const ecoverse = await this.getEcoverse({
      relations: ['groups'],
    });
    // Also add the user into the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(ctUser, membersGroup);

    return ctUser;
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

  // Removes the user and deletes the profile
  async removeUser(userID: number): Promise<boolean> {
    const user = await this.userService.getUserByIdOrFail(userID);

    await this.userService.removeUser(user);
    if (this.accountService.accountUsageEnabled())
      return await this.accountService.removeUserAccount(user.accountUpn);
    return true;
  }

  // Removes the user and deletes the profile
  async updateUserAccountPassword(
    userID: number,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.userService.getUserByIdOrFail(userID);

    if (this.accountService.accountUsageEnabled())
      return await this.accountService.updateUserAccountPassword(
        user.accountUpn,
        newPassword
      );
    return true;
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
}
