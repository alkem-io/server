import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IContext } from "src/context/context.interface";
import { IOrganisation } from "src/organisation/organisation.interface";
import { RestrictedGroupNames } from "src/user-group/user-group.entity";
import { IUserGroup } from "src/user-group/user-group.interface";
import { UserGroupService } from "src/user-group/user-group.service";
import { User } from "src/user/user.entity";
import { Repository } from "typeorm";
import { Ecoverse } from "./ecoverse.entity";
import { IEcoverse } from "./ecoverse.interface";

@Injectable()
export class EcoverseService {

    constructor(
      private userGroupService: UserGroupService,
      @InjectRepository(Ecoverse)
      private ecoverseRepository: Repository<Ecoverse>
      ) {
    }
  
    // Populate an empty ecoverse
    async populateEmptyEcoverse(ecoverse: IEcoverse): Promise<IEcoverse> {
      // Create new Ecoverse
      this.initialiseMembers(ecoverse);
      ecoverse.name = 'Empty ecoverse';
      ecoverse.context.tagline = 'An empty ecoverse to be populated';
      ecoverse.host.name = 'Default host organisation';
  
      // Find the admin user and put that person in as member + admin
      const adminUser = new User('admin');
      const admins = await this.userGroupService.getGroupByName(ecoverse, RestrictedGroupNames.Admins);
      const members = await this.userGroupService.getGroupByName(ecoverse, RestrictedGroupNames.Members);
      this.userGroupService.addUserToGroup(adminUser, admins);
      this.userGroupService.addUserToGroup(adminUser, members);
  
      return ecoverse;
    }
  
    // Helper method to ensure all members that are arrays are initialised properly.
    // Note: has to be a seprate call due to restrictions from ORM.
    async initialiseMembers(ecoverse: IEcoverse): Promise<IEcoverse> {
      if (!ecoverse.restrictedGroupNames) {
        ecoverse.restrictedGroupNames = [RestrictedGroupNames.Members, RestrictedGroupNames.Admins];
      }
  
      if (!ecoverse.groups) {
        ecoverse.groups = [];
      }
  
      // Check that the mandatory groups for a challenge are created
      await this.userGroupService.addMandatoryGroups(ecoverse, ecoverse.restrictedGroupNames);
  
      if (!ecoverse.tags) {
        ecoverse.tags = [];
      }
  
      if (!ecoverse.challenges) {
        ecoverse.challenges = [];
      }
  
      if (!ecoverse.partners) {
        ecoverse.partners = [];
      }
  
      return ecoverse;
    }

    async getEcoverse(): Promise<IEcoverse> {
      try {
  
        const ecoverse = await this.ecoverseRepository.findOneOrFail();
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
  
        return ecoverse;
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getEcoverse()!!!', exception: e });
        throw e;
      }
    }
  
    async getName(): Promise<string> {
      try {
  
        const ecoverse = await this.getEcoverse()
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
  
        return ecoverse.name;
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getName()!!!', exception: e });
        throw e;
      }
    }
  
    async getMembers(): Promise<IUserGroup> {
      try {
        const ecoverse = await this.getEcoverse() as Ecoverse;
        const membersGroup = await this.userGroupService.getGroupByName(ecoverse, RestrictedGroupNames.Members);
  
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
  
        return membersGroup as IUserGroup;
  
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
        throw e;
      }
    }
  
    async getGroups(): Promise<IUserGroup[]> {
      try {
        const ecoverse = await this.getEcoverse() as Ecoverse;
  
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
        // Convert groups array into IGroups array
        const groups: IUserGroup[] = [];
        if (!ecoverse.groups) {
          throw new Error('Unreachable');
        }
        for (const group of ecoverse.groups) {
          groups.push(group);
        }
        return groups;
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e });
        throw e;
      }
    }
  
    async getContext(): Promise<IContext> {
      try {
        const ecoverse = await this.getEcoverse() as Ecoverse;
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
  
        return ecoverse.context as IContext;
  
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getContext()!!!', exception: e });
        throw e;
      }
    }
  
    async getHost(): Promise<IOrganisation> {
      try {
        const ecoverse = await this.getEcoverse() as Ecoverse;
        // this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });
  
        return ecoverse.host as IOrganisation;
  
      } catch (e) {
        // this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getHost()!!!', exception: e });
        throw e;
      }
    }
  }
