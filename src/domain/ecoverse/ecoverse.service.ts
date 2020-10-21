import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountService } from 'src/utils/account/account.service';
import { Repository } from 'typeorm';
import { ChallengeInput } from '../challenge/challenge.dto';
import { Challenge } from '../challenge/challenge.entity';
import { IChallenge } from '../challenge/challenge.interface';
import { ChallengeService } from '../challenge/challenge.service';
import { IContext } from '../context/context.interface';
import { ContextService } from '../context/context.service';
import { OrganisationInput } from '../organisation/organisation.dto';
import { Organisation } from '../organisation/organisation.entity';
import { IOrganisation } from '../organisation/organisation.interface';
import { OrganisationService } from '../organisation/organisation.service';
import { ITagset } from '../tagset/tagset.interface';
import { TagsetService } from '../tagset/tagset.service';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { UserInput } from '../user/user.dto';
import { IUser } from '../user/user.interface';
import { UserService } from '../user/user.service';
import { EcoverseInput } from './ecoverse.dto';
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';

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

    // Initialise contained singletons
    await this.tagsetService.initialiseMembers(ecoverse.tagset);
    await this.contextService.initialiseMembers(ecoverse.context);

    return ecoverse;
  }

  async getEcoverse(): Promise<IEcoverse> {
    return await this.ecoverseRepository.findOneOrFail();
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

  async getMembers(): Promise<IUser[]> {
    try {
      const ecoverse = (await this.getEcoverse()) as IEcoverse;
      const membersGroup = await this.userGroupService.getGroupByName(
        ecoverse,
        RestrictedGroupNames.Members
      );
      console.log('Ecoverse: Get Members');
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
      return this.userGroupService.getMembers(membersGroup.id);
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
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
      const tagset = this.tagsetService.defaultTagset(g.profile);
      if (this.tagsetService.hasTag(tagset, tagFilter)) {
        return true;
      }
      return false;
    });
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

  async getChallenges(): Promise<IChallenge[]> {
    try {
      console.time('Get challenges');
      const ecoverseId = await this.getEcoverseId();
      const challanges = await this.challengeService.getChallenges(ecoverseId);
      console.timeEnd('Get challenges');
      return challanges;

      //return (ecoverse && ecoverse.challenges) || [];
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
      throw e;
    }
  }

  async getOrganisations(): Promise<IOrganisation[]> {
    try {
      const ecoverse: IEcoverse = await this.getEcoverse();

      if (!ecoverse.organisations)
        throw new Error('Ecoverse organisations must be defined');

      return ecoverse.organisations as IOrganisation[];
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
    const query = this.ecoverseRepository
      .createQueryBuilder()
      .select('ecoverse')
      .from(Ecoverse, 'ecoverse')
      .leftJoinAndSelect('ecoverse.groups', 'groups');

    const ecoverses = await query.getMany();
    const ecoverse = ecoverses[0];

    const group = await this.userGroupService.addGroupWithName(
      ecoverse,
      groupName
    );
    await this.ecoverseRepository.save(ecoverse);
    return group;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    const query = this.ecoverseRepository
      .createQueryBuilder()
      .select('ecoverse')
      .from(Ecoverse, 'ecoverse')
      .leftJoinAndSelect('ecoverse.challenges', 'challenges');

    const ecoverses = await query.getMany();
    const ecoverse = ecoverses[0];
    if (!ecoverse.challenges) {
      throw new Error('Challenges must be defined');
    }
    // First check if the challenge already exists on not...
    const existingChallenge = ecoverse.challenges.find(
      t => t.name === challengeData.name
    );
    if (existingChallenge) return existingChallenge; // Option:merge?

    // No existing challenge found, create and initialise a new one!
    const challenge = await this.challengeService.createChallenge(
      challengeData
    );

    ecoverse.challenges.push(challenge as Challenge);
    await this.ecoverseRepository.save(ecoverse);

    return challenge;
  }

  async createOrganisation(
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const ecoverse = (await this.getEcoverse()) as Ecoverse;
    if (!ecoverse.organisations) {
      throw new Error('Organisations must be defined');
    }
    // First check if the organisation already exists on not...
    for (const organisation of ecoverse.organisations) {
      if (organisation.name === organisationData.name) {
        // Organisation already exists, just return. Option:merge?
        return organisation;
      }
    }

    // No existing organisation found, create and initialise a new one!
    const organisation = await this.organisationService.createOrganisation(
      organisationData
    );

    ecoverse.organisations.push(organisation as Organisation);
    await this.ecoverseRepository.save(ecoverse);

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

    const ecoverse = await this.getEcoverse();
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
    const ctverse = await this.getEcoverse();
    const adminsGroup = await this.userGroupService.getGroupByName(
      ctverse,
      RestrictedGroupNames.Admins
    );

    if (await this.userGroupService.addUserToGroup(user, adminsGroup)) {
      await this.ecoverseRepository.save(ctverse);
      return true;
    }

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
    if (ecoverseData.context)
      await this.contextService.update(ecoverse.context, ecoverseData.context);

    if (ecoverseData.tags && ecoverseData.tags.tags)
      this.tagsetService.replaceTags(
        ecoverse.tagset.id,
        ecoverseData.tags.tags
      );

    await this.ecoverseRepository.save(ecoverse);

    return ecoverse;
  }
}
