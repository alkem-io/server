import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '../../interfaces/groupable.interface';
import { Challenge } from '../challenge/challenge.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Profile } from '../profile/profile.entity';
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

  //toDo vyanakiev - fix this
  async getGroups(groupable: IGroupable): Promise<IUserGroup[]> {
    if (groupable instanceof Ecoverse) {
      return await this.groupRepository.find({
        where: { ecoverse: { id: groupable.id } },
        relations: ['members'],
      });
    }
    if (groupable instanceof Challenge) {
      return await this.groupRepository.find({
        where: { challenge: { id: groupable.id } },
        relations: ['members'],
      });
    }
    if (groupable instanceof Organisation) {
      return await this.groupRepository.find({
        where: { organisation: { id: groupable.id } },
        relations: ['members'],
      });
    }

    return [];
  }

  async initialiseMembers(group: IUserGroup): Promise<IUserGroup> {
    if (!group.members) {
      group.members = [];
    }
    if (!group.profile) {
      group.profile = new Profile();
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

  async getGroupByID(
    groupID: number,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup> {
    //const t1 = performance.now()
    const group = await this.groupRepository.findOne(
      {
        id: groupID,
      },
      options
    );
    if (!group) throw new Error(`Unable to find group with ID: ${groupID}`);
    return group;
  }

  async addUser(userID: number, groupID: number): Promise<IUserGroup> {
    const user = (await this.userService.getUserByID(userID)) as IUser;
    if (!user) throw new Error(`No user with id ${userID} was found!`);

    const group = (await this.getGroupByID(groupID, {
      relations: ['members'],
    })) as IUserGroup;
    if (!group) throw new Error(`No group with id ${groupID} was found!`);

    if (group.members?.some(member => member.id === userID)) {
      console.log(
        `User with id ${userID} is already in a group with id ${groupID}`
      );
      return group;
    }

    return this.addUserToGroup(user, group);
  }

  async isUserGroupMember(userID: number, groupID: number): Promise<boolean> {
    if (!(await this.userService.userExists(undefined, userID)))
      throw new Error(`No user with id ${userID} found!`);
    if (!(await this.groupExists(groupID)))
      throw new Error(`No group with id ${groupID} found!`);

    const userGroup = (await this.groupRepository.findOne({
      where: { members: { id: userID }, id: groupID },
      relations: ['members'],
    })) as IUserGroup;

    const members = userGroup?.members;
    if (!members || members.length === 0) return false;

    return true;
  }

  async groupExists(groupID: number): Promise<boolean> {
    const group = this.groupRepository.findOne({ id: groupID });
    if (group) return true;
    else return false;
  }

  async addUserToGroup(user: IUser, group: IUserGroup): Promise<IUserGroup> {
    if (!group.members) {
      throw new Error(
        `Attempt to add user to a non-initialised group: ${group.name}`
      );
    }

    //toDo vyanakiev - move the check for group membership to all method invokers to avoid multiple SQL calls.

    group.members.push(user);
    await this.groupRepository.save(group);
    console.info(`User ${user.email} added to group ${group.name}!`);
    return group;
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

    group.members = group.members.filter(member => !(member.id === user.id));

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

  //toDo vyanakiev - fix this
  async getGroupByName(
    groupable: IGroupable,
    name: string
  ): Promise<IUserGroup> {
    if (groupable instanceof Ecoverse) {
      const userGroup = (await this.groupRepository.findOne({
        where: { ecoverse: { id: groupable.id }, name: name },
        relations: ['ecoverse', 'members'],
      })) as IUserGroup;
      return userGroup;
    }
    if (groupable instanceof Challenge) {
      return (await this.groupRepository.findOne({
        where: { challenge: { id: groupable.id }, name: name },
        relations: ['challenge', 'members'],
      })) as IUserGroup;
    }
    if (groupable instanceof Organisation) {
      return (await this.groupRepository.findOne({
        where: { organisation: { id: groupable.id }, name: name },
        relations: ['organisation', 'members'],
      })) as IUserGroup;
    }

    throw new Error('Unrecognized groupabble type!');
  }

  async addMandatoryGroups(
    groupable: IGroupable,
    mandatoryGroupNames: string[]
  ): Promise<IGroupable> {
    if (!groupable.groups)
      throw new Error('Non-initialised Groupable submitted');

    const newMandatoryGroups = new Set(
      [...mandatoryGroupNames].filter(
        mandatoryGroupName =>
          !groupable.groups?.find(
            groupable => groupable.name === mandatoryGroupName
          )
      )
    );

    for (const groupToAdd of newMandatoryGroups) {
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
      return await this.getGroupByName(groupable, name);
    }

    if (groupable.restrictedGroupNames?.includes(name)) {
      console.log(
        `Attempted to create a usergroup using a restricted name: ${name}`
      );
      throw new Error(
        'Unable to create user group with restricted name: ' + { name }
      );
    }

    const newGroup: IUserGroup = new UserGroup(name);
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

    if (!groupable.groups) {
      throw new Error('No restricted group names found!');
    }
    return groupable.groups;
  }

  async getMembers(groupID: number): Promise<IUser[]> {
    return (
      await this.groupRepository.findOne({
        where: { id: groupID },
        relations: ['members'],
      })
    )?.members as IUser[];
  }
}
