import { Injectable } from '@nestjs/common';
import { IGroupable } from '../../interfaces/groupable.interface';
import { IUser } from '../user/user.interface';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';

@Injectable()
export class UserGroupService {
  initialiseMembers(group: IUserGroup): IUserGroup {
    if (!group.members) {
      group.members = [];
    }

    return group;
  }

  addUserToGroup(user: IUser, group: IUserGroup): IUser {
    if (!group.members) {
      group.members = [];
    }

    for (const existingUser of group.members) {
      if (user.name === existingUser.name) {
        // Found an existing user
        return user;
      }
    }

    // User was not already a member so add the user
    group.members.push(user);
    return user;
  }

  getGroupByName(groupable: IGroupable, name: string): IUserGroup {
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

  addMandatoryGroups(
    groupable: IGroupable,
    mandatoryGroupNames: string[]
  ): IGroupable {
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
      groupable.groups.push(newGroup as IUserGroup);
    }
    return groupable;
  }

  hasGroupWithName(groupable: IGroupable, name: string): boolean {
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

  addGroupWithName(groupable: IGroupable, name: string): IUserGroup {
    // Check if the group already exists, if so log a warning
    if (this.hasGroupWithName(groupable, name)) {
      // TODO: log a warning
      return this.getGroupByName(groupable, name);
    }

    if (groupable.restrictedGroupNames?.includes(name)) {
      console.log(
        `Attempted to create a usergroup using a restricted name: ${name}`
      );
      throw new Error(
        'Unable to create user group with restricted name: ' + { name }
      );
    }

    const newGroup: IUserGroup = new UserGroup(name) as IUserGroup;
    groupable.groups?.push(newGroup);
    return newGroup;
  }

  /* Create the set of restricted group names for an entity that has groups */
  createRestrictedGroups(groupable: IGroupable, names: string[]): IUserGroup[] {
    if (!groupable.restrictedGroupNames) {
      groupable.restrictedGroupNames = [];
    }
    for (const name of names) {
      const group = new UserGroup(name) as IUserGroup;
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
