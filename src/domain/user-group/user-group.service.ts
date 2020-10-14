import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IGroupable } from '../../interfaces/groupable.interface';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { UserService } from '../user/user.service';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';

@Injectable()
export class UserGroupService {
  constructor(
    private userService: UserService,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>
  ) {}

  async initialiseMembers(group: IUserGroup): Promise<IUserGroup> {
    if (!group.members) {
      group.members = [];
    }

    return group;
  }

  async assignFocalPoint(userID: number, groupID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      console.log(msg);
      throw new Error(msg);
    }

    const group = (await this.getGroupByID(groupID)) as UserGroup;
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      console.log(msg);
      throw new Error(msg);
    }

    // Add the user to the group if not already a member
    await this.addUserToGroup(user, group);

    // Have both user + group so do the add
    group.focalPoint = user as User;
    await this.groupRepository.save(group);

    return group;
  }

  async getGroupByID(groupID: number): Promise<IUserGroup> {
    //const t1 = performance.now()
    const group = await UserGroup.findOne({ where: [{ id: groupID }] });
    if (!group) throw new Error(`Unable to find group with ID: ${groupID}`);
    return group;
  }

  async addUser(userID: number, groupID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      console.log(msg);
      throw new Error(msg);
    }

    const group = (await this.getGroupByID(groupID)) as UserGroup;
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      console.log(msg);
      throw new Error(msg);
    }

    // Have both user + group so do the add
    this.addUserToGroup(user, group);
    await group.save();

    return group;
  }

  async addUserToGroup(user: IUser, group: IUserGroup): Promise<boolean> {
    if (!group.members) {
      group.members = [];
    }

    for (const existingUser of group.members) {
      if (user.name === existingUser.name) {
        // Found an existing user
        return false;
      }
    }

    // User was not already a member so add the user
    group.members.push(user);
    return true;
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
    throw new Error(`Unable to find group with the name:' + ${name}`);
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
    const alreadyExists = this.hasGroupWithName(groupable, name);
    if (alreadyExists) {
      console.log(`Attempting to add group that already exists: ${name}`);
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
