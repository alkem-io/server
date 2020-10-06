import { Injectable } from '@nestjs/common';
import { IGroupable } from 'src/interfaces/groupable.interface';
import { IUser } from 'src/user/user.interface';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';

@Injectable()
export class UserGroupService {

    async initialiseMembers(group: IUserGroup): Promise<IUserGroup> {
      if (!group.members) {
        group.members = [];
      }
  
      return group;
    }
  
    async addUserToGroup(newUser: IUser, group: IUserGroup): Promise<IUser> {
      if (!group.members) {
        group.members = [];
      }
  
      for (const user of group.members) {
        if (newUser.name === user.name) {
          // Found an existing user
          return newUser;
        }
      }
  
      // User was not already a member so add the user
      group.members.push(newUser);
      return newUser;
    }
  
    async getGroupByName(groupable: IGroupable, name: string): Promise<IUserGroup> {
      // Double check groups array is initialised
      if (!groupable.groups) {
        throw new Error('Non-initialised Groupable submitted');
      }
  
      for (const group of groupable.groups) {
        if (group.name === name) {
          return group;
        }
      }
  
      // If get here then no match group was found
      throw new Error('Unable to find group with the name:' + { name });
    }
  
    async addMandatoryGroups(groupable: IGroupable, mandatoryGroupNames: string[]): Promise<IGroupable> {
      const groupsToAdd: string[] = [];
      if (!groupable.groups) {
        throw new Error('Non-initialised Groupable submitted');
      }
      for (const mandatoryName of mandatoryGroupNames) {
        let groupFound = false;
        for (const group of groupable.groups) {
          if (group.name === mandatoryName) {
            // Found the group, break...
            groupFound = true;
            break;
          }
        }
        if (!groupFound) {
          // Add to list of groups to add
          groupsToAdd.push(mandatoryName);
        }
      }
      for (const groupToAdd of groupsToAdd) {
        const newGroup = new UserGroup(groupToAdd);
        groupable.groups.push(newGroup);
      }
      return groupable;
    }
    
    async hasGroupWithName(groupable: IGroupable, name: string): Promise<boolean> {
      // Double check groups array is initialised
      if (!groupable.groups) {
        throw new Error('Non-initialised Groupable submitted');
      }
  
      // Find the right group
      for (const group of groupable.groups) {
        if (group.name === name) {
          return true;
        }
      }
  
      // If get here then no match group was found
      return false;
    }
  
    async addGroupWithName(groupable: IGroupable, name: string): Promise<IUserGroup> {
      // Check if the group already exists, if so log a warning
      if (this.hasGroupWithName(groupable, name)) {
        // TODO: log a warning
        return this.getGroupByName(groupable, name);
      }
  
      if (groupable.restrictedGroupNames?.includes(name)) {
        console.log(`Attempted to create a usergroup using a restricted name: ${name}`);
        throw new Error('Unable to create user group with restricted name: ' + { name });
      }
  
      const newGroup = new UserGroup(name);
      groupable.groups?.push(newGroup);
      return newGroup;
    }
  
    /* Create the set of restricted group names for an entity that has groups */
  
    async createRestrictedGroups(groupable: IGroupable, names: string[]): Promise<IUserGroup[]> {
      if (!groupable.restrictedGroupNames) {
        groupable.restrictedGroupNames = [];
      }
      for (const name of names) {
        const group = new UserGroup(name);
        groupable.groups?.push(group);
        groupable.restrictedGroupNames.push(name);
      }
  
      // Todo: is this the right return type?
      if (!groupable.groups) {
        throw new Error('Cannot reach here');
      }
      return groupable.groups;
    }
  }
