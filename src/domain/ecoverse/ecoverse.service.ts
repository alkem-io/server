import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IContext } from '../context/context.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { User } from '../user/user.entity';
import { Repository } from 'typeorm';
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

@Injectable()
export class EcoverseService {
  constructor(
    private challengeService: ChallengeService,
    private organisationService: OrganisationService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  // Populate an empty ecoverse
  async populateEmptyEcoverse(ecoverse: IEcoverse): Promise<IEcoverse> {
    // Create new Ecoverse
    this.initialiseMembers(ecoverse);
    ecoverse.name = 'Empty ecoverse';
    (ecoverse.context as IContext).tagline =
      'An empty ecoverse to be populated';
    (ecoverse.host as IOrganisation).name = 'Default host organisation';

    // Find the admin user and put that person in as member + admin
    const adminUser = new User('admin');
    const admins = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Admins
    );
    const members = await this.userGroupService.getGroupByName(
      ecoverse,
      RestrictedGroupNames.Members
    );
    this.userGroupService.addUserToGroup(adminUser, admins);
    this.userGroupService.addUserToGroup(adminUser, members);

    return ecoverse;
  }

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
    this.tagsetService.initialiseMembers(ecoverse.tagset);
    this.contextService.initialiseMembers(ecoverse.context);

    return ecoverse;
  }

  async getEcoverse(): Promise<IEcoverse> {
    try {
      const ecoverseArray = await this.ecoverseRepository.find();
      const ecoverseCount = ecoverseArray.length;
      if (ecoverseCount == 0) {
        console.log('No ecoverse found, creating empty ecoverse...');
        // Create a new ecoverse
        const ecoverse = new Ecoverse();
        this.initialiseMembers(ecoverse);
        this.populateEmptyEcoverse(ecoverse);
        ecoverse.save();
        return ecoverse as IEcoverse;
      }
      if (ecoverseCount == 1) {
        return ecoverseArray[0] as IEcoverse;
      }
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      throw new Error('Cannot have more than one ecoverse');
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getEcoverse()!!!', exception: e });
      throw e;
    }
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

      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return membersGroup.members as IUser[];
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
      throw e;
    }
  }

  async getGroups(): Promise<IUserGroup[]> {
    try {
      const ecoverse = (await this.getEcoverse()) as IEcoverse;

      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
      // Convert groups array into IGroups array
      if (!ecoverse.groups) {
        throw new Error('Unreachable');
      }
      return ecoverse.groups as IUserGroup[];
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
      throw e;
    }
  }

  async getChallenges(): Promise<IChallenge[]> {
    try {
      const ecoverse: IEcoverse = await this.getEcoverse();

      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
      // Convert groups array into IGroups array
      if (!ecoverse.challenges) {
        throw new Error('Unreachable');
      }
      return ecoverse.challenges as IChallenge[];
    } catch (e) {
      // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
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
    const ecoverse = (await this.getEcoverse()) as Ecoverse;
    const group = await this.userGroupService.addGroupWithName(
      ecoverse,
      groupName
    );
    await ecoverse.save();
    return group;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    const ecoverse = (await this.getEcoverse()) as Ecoverse;
    if (!ecoverse.challenges) {
      throw new Error('Challenges must be defined');
    }
    // First check if the challenge already exists on not...
    for (const challenge of ecoverse.challenges) {
      if (challenge.name === challengeData.name) {
        // Challenge already exists, just return. Option:merge?
        return challenge;
      }
    }

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
    const user = await this.userService.createUser(userData);
    const ecoverse = await this.getEcoverse();
    // Also add the user into the members group
    const membersGroup = this.userGroupService.getGroupByName(
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
