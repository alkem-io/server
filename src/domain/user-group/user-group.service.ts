import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IGroupable } from '../../interfaces/groupable.interface';
import { Challenge } from '../challenge/challenge.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Organisation } from '../organisation/organisation.entity';
import { ProfileService } from '../profile/profile.service';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { UserService } from '../user/user.service';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';

@Injectable()
export class UserGroupService {
  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>
  ) {}

  async initialiseMembers(group: IUserGroup): Promise<IUserGroup> {
    if (!group.members) {
      group.members = [];
    }
    // Initialise the profile
    await this.profileService.initialiseMembers(group.profile);

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
    await this.addUserToGroup(user, group);

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
    await this.groupRepository.save(group);
    return true;
  }

  async removeUser(userID: number, groupID: number): Promise<IUserGroup> {
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
    await this.removeUserFromGroup(user, group);

    return group;
  }

  async removeUserFromGroup(
    user: IUser,
    group: IUserGroup
  ): Promise<IUserGroup> {
    if (!group.members) throw new Error('Members not initialised');

    // Check the user exists in the group
    const count = group.members.length;
    for (let i = 0; i < count; i++) {
      const existingUser = group.members[i];
      if (user.id === existingUser.id) {
        // Found an existing user
        group.members.splice(i, 1);
        break;
      }
    }

    // Also remove the user from being a focal point
    if (group.focalPoint && group.focalPoint.id === user.id) {
      this.removeFocalPoint(group.id);
    }

    await this.groupRepository.save(group);

    return group;
  }

  async removeFocalPoint(groupID: number): Promise<IUserGroup> {
    const group = (await this.getGroupByID(groupID)) as UserGroup;
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      console.log(msg);
      throw new Error(msg);
    }
    // Set focalPoint to NULL will remove the relation.
    // For typeorm 'undefined' means - 'Not changed'
    // More information: https://github.com/typeorm/typeorm/issues/5454
    group.focalPoint = null;

    await this.groupRepository.save(group);

    return group;
  }

  async getGroupByName(
    groupable: IGroupable,
    name: string
  ): Promise<IUserGroup> {
    let query = this.groupRepository
      .createQueryBuilder()
      .select('group')
      .from(UserGroup, 'group')
      .where('group.name=:name', { name });

    if (groupable instanceof Ecoverse) {
      query = query.andWhere('group.ecoverseId = :id', {
        id: (groupable as Ecoverse).id,
      });
    }
    if (groupable instanceof Challenge) {
      query = query.andWhere('group.challengeId = :id', {
        id: (groupable as Challenge).id,
      });
    }
    if (groupable instanceof Organisation) {
      query = query.andWhere('group.organisationId = :id', {
        id: (groupable as Organisation).id,
      });
    }

    const group = await query.getOne();
    if (group) {
      return group;
    }
    // If get here then no match group was found
    throw new Error(`Unable to find group with the name:' + ${name}`);
  }

  async getGroups(groupable: IGroupable): Promise<IUserGroup[]> {
    let query = this.groupRepository
      .createQueryBuilder()
      .select('group')
      .from(UserGroup, 'group')
      .leftJoinAndSelect('group.members', 'members');

    if (groupable instanceof Ecoverse) {
      query = query.where('group.ecoverseId = :id', {
        id: (groupable as Ecoverse).id,
      });
    }
    if (groupable instanceof Challenge) {
      query = query.where('group.challengeId = :id', {
        id: (groupable as Challenge).id,
      });
    }
    if (groupable instanceof Organisation) {
      query = query.where('group.organisationId = :id', {
        id: (groupable as Organisation).id,
      });
    }

    const group = await query.getMany();
    if (group) {
      return group;
    }
    // If get here then no match group was found
    throw new Error(`Unable to find group with the name:' + ${name}`);
  }

  async addMandatoryGroups(
    groupable: IGroupable,
    mandatoryGroupNames: string[]
  ): Promise<IGroupable> {
    const groupsToAdd: string[] = [];
    if (!groupable.groups)
      throw new Error('Non-initialised Groupable submitted');
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
      await this.initialiseMembers(newGroup);
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

  async addGroupWithName(
    groupable: IGroupable,
    name: string
  ): Promise<IUserGroup> {
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
    await this.initialiseMembers(newGroup);
    await groupable.groups?.push(newGroup);
    return newGroup;
  }

  /* Create the set of restricted group names for an entity that has groups */
  async createRestrictedGroups(
    groupable: IGroupable,
    names: string[]
  ): Promise<IUserGroup[]> {
    if (!groupable.restrictedGroupNames) {
      groupable.restrictedGroupNames = [];
    }
    for (const name of names) {
      const group = new UserGroup(name) as IUserGroup;
      await this.initialiseMembers(group);
      groupable.groups?.push(group);
      groupable.restrictedGroupNames.push(name);
    }

    // Todo: is this the right return type?
    if (!groupable.groups) {
      throw new Error('Cannot reach here');
    }
    return groupable.groups;
  }

  async getMembers(groupId: number): Promise<IUser[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    return (group && group.members) || [];
  }
}
