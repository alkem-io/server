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

@Injectable()
export class EcoverseService {
  constructor(
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
    if (!ecoverse.restrictedGroupNames) {
      ecoverse.restrictedGroupNames = [
        RestrictedGroupNames.Members,
        RestrictedGroupNames.Admins,
      ];
    }

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

    if (!ecoverse.partners) {
      ecoverse.partners = [];
    }

    if (!ecoverse.tagset) {
      this.tagsetService.initialiseMembers(ecoverse.tagset);
    }

    return ecoverse;
  }

  async getEcoverse(): Promise<IEcoverse> {
    try {
      const ecoverse = await this.ecoverseRepository.findOneOrFail();
      // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse as IEcoverse;
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
    const group = this.userGroupService.addGroupWithName(ecoverse, groupName);
    await ecoverse.save();
    return group;
  }

  async update(ecoverseData: EcoverseInput): Promise<IEcoverse> {
    const ctVerse = await this.getEcoverse();

    // Copy over the received data
    if (ecoverseData.name) {
      ctVerse.name = ecoverseData.name;
    }
    if (ecoverseData.context)
      this.contextService.update(ctVerse, ecoverseData.context);

    if (ecoverseData.tags && ecoverseData.tags.tags)
      this.tagsetService.replaceTags(ctVerse.tagset.id, ecoverseData.tags.tags);

    await (ctVerse as Ecoverse).save();

    return ctVerse;
  }
}
