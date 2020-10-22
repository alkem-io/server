import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IContext } from '../context/context.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { FindOneOptions, Repository } from 'typeorm';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
import { ContextService } from '../context/context.service';
import { EcoverseInput } from './ecoverse.dto';
import { TagsetService } from '../tagset/tagset.service';
import { IUser } from '../user/user.interface';
import { IChallenge } from '../challenge/challenge.interface';
import { ITagset } from '../tagset/tagset.interface';
import { Challenge } from '../challenge/challenge.entity';
import { ChallengeService } from '../challenge/challenge.service';
import { ChallengeInput } from '../challenge/challenge.dto';
import { UserService } from '../user/user.service';
import { UserInput } from '../user/user.dto';
import { OrganisationInput } from '../organisation/organisation.dto';
import { Organisation } from '../organisation/organisation.entity';
import { OrganisationService } from '../organisation/organisation.service';
import { AccountService } from 'src/utils/account/account.service';
import { Context } from '../context/context.entity';
import { RestrictedTagsetNames, Tagset } from '../tagset/tagset.entity';

@Injectable()
export class EcoverseService {
  constructor(
    private challengeService: ChallengeService,
    private organisationService: OrganisationService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    private accountService: AccountService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
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

    if (!ecoverse.challenges) {
      ecoverse.challenges = [];
    }

    if (!ecoverse.organisations) {
      ecoverse.organisations = [];
    }

    if (!ecoverse.tagset) {
      ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
    }

    if (!ecoverse.context) {
      ecoverse.context = new Context();
    }

    // Initialise contained singletons
    await this.tagsetService.initialiseMembers(ecoverse.tagset);
    await this.contextService.initialiseMembers(ecoverse.context);

    return ecoverse;
  }

  async getEcoverse(options?: FindOneOptions<Ecoverse>): Promise<IEcoverse> {
    return await this.ecoverseRepository.findOneOrFail(options);
  }

  async getName(): Promise<string> {
    try {
      const ecoverse = await this.getEcoverse();
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse.name;
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getName()!!!', exception: e });
      throw e;
    }
  }

  async getEcoverseId(): Promise<number> {
    const ecoverse = await this.ecoverseRepository
      .createQueryBuilder('ecoverse')
      .select('ecoverse.id')
      .getOne(); // TODO [ATS] Replace with getOneOrFail when it is released. https://github.com/typeorm/typeorm/blob/06903d1c914e8082620dbf16551caa302862d328/src/query-builder/SelectQueryBuilder.ts#L1112

    if (!ecoverse) {
      throw new Error('Ecoverse is missing!');
    }
    return ecoverse.id;
  }

  async getMembers(): Promise<IUser[]> {
    try {
      const ecoverse = (await this.getEcoverse({
        relations: ['groups'],
      })) as IEcoverse;
      const membersGroup = await this.userGroupService.getGroupByName(
        ecoverse,
        RestrictedGroupNames.Members
      );

      const members = membersGroup.members;
      return members as IUser[];
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
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
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
    try {
      const ecoverseId = await this.getEcoverseId();
      const challanges = await this.challengeService.getChallenges(ecoverseId);
      return challanges;
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
      throw e;
    }
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
    try {
      const ecoverse = (await this.getEcoverse()) as IEcoverse;
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse.context as IContext;
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getContext()!!!', exception: e });
      throw e;
    }
  }

  async getTagset(): Promise<ITagset> {
    try {
      const ecoverse: IEcoverse = await this.getEcoverse();
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse.tagset as ITagset;
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getContext()!!!', exception: e });
      throw e;
    }
  }

  async getHost(): Promise<IOrganisation> {
    try {
      const ecoverse = (await this.getEcoverse()) as Ecoverse;
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse.host as IOrganisation;
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getHost()!!!', exception: e });
      throw e;
    }
  }

  async createGroup(groupName: string): Promise<IUserGroup> {
    console.log(`Adding userGroup (${groupName}) to ecoverse`);

    const ecoverse = (await this.getEcoverse({
      join: {
        alias: 'ecoverse',
        leftJoinAndSelect: {
          groups: 'ecoverse.groups',
        },
      },
    })) as Ecoverse;

    const group = await this.userGroupService.addGroupWithName(
      ecoverse,
      groupName
    );

    await ecoverse.save();

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
      throw new Error('Challenges must be defined');
    }
    // First check if the challenge already exists on not...
    // TODO: Inform the user that the entity already exists instead of returning it.
    let challenge = ecoverse.challenges.find(
      c => c.name === challengeData.name
    );
    if (!challenge) {
      // No existing challenge found, create and initialise a new one!
      challenge = await this.challengeService.createChallenge(challengeData);

      ecoverse.challenges.push(challenge as Challenge);
      await this.ecoverseRepository.save(ecoverse);
    } else {
      // load the whole challenge
      console.log('Creating Challenge: Challenge already exists!');
      challenge = await this.challengeService.getChallengeByID(challenge.id);
    }
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
      throw new Error('Organisations must be defined');
    }

    let organisation = ecoverse.organisations.find(
      o => o.name === organisationData.name
    );
    // First check if the organisation already exists on not...
    if (!organisation) {
      // No existing organisation found, create and initialise a new one!
      organisation = await this.organisationService.createOrganisation(
        organisationData
      );
      ecoverse.organisations.push(organisation as Organisation);
      await this.ecoverseRepository.save(ecoverse);
    }

    return organisation;
  }

  // Create the user and add the user into the members group
  async createUser(userData: UserInput): Promise<IUser> {
    const ctUserExists = await this.userService.userExists(userData.email);
    let accountExists = true;
    if (this.accountService.accountUsageEnabled()) {
      accountExists = await this.accountService.accountExists(userData.email);
    }

    if (ctUserExists) {
      if (accountExists) {
        console.info(`User ${userData.email} already exists!`);
        return (await this.userService.getUserByEmail(userData.email)) as IUser;
      } else {
        throw new Error(
          `User ${userData.email} is in an inconsistent state. The user exists in CT database but doesn't have an account`
        );
      }
    }

    const user = await this.userService.createUser(userData);
    if (!accountExists) await this.accountService.createAccount(userData);

    const ecoverse = await this.getEcoverse({
      relations: ['groups'],
    });
    // Also add the user into the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);
    await this.ecoverseRepository.save(ecoverse);

    return user;
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
      throw new Error(`${groupName} is not a restricted group name!`);

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
    const user = await this.userService.getUserByID(userID);
    if (!user) throw new Error(`Could not locate specified user: ${userID}`);

    const groups = await this.getGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      await this.userGroupService.removeUserFromGroup(user, group);
    }

    // And finally remove the user
    await this.userService.removeUser(user);

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

    if (ecoverseData.tags && ecoverseData.tags.tags) {
      if (!ecoverse.tagset) {
        ecoverse.tagset = new Tagset(RestrictedTagsetNames.Default);
      }
      this.tagsetService.replaceTags(
        ecoverse.tagset.id,
        ecoverseData.tags.tags
      );
    }

    await this.ecoverseRepository.save(ecoverse);

    return ecoverse;
  }
}
