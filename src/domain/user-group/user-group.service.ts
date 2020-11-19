import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '../../interfaces/groupable.interface';
import { Challenge } from '../challenge/challenge.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Organisation } from '../organisation/organisation.entity';
import { ProfileService } from '../profile/profile.service';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { UserService } from '../user/user.service';
import { RestrictedGroupNames, UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { getConnection } from 'typeorm';
import { getManager } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContexts } from '../../utils/logging/logging.contexts';
import { Opportunity } from '../opportunity/opportunity.entity';

@Injectable()
export class UserGroupService {
  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createUserGroup(name: string): Promise<IUserGroup> {
    const group = new UserGroup(name);
    await this.initialiseMembers(group);
    await this.groupRepository.save(group);
    this.logger.verbose(
      `Created new group (${group.id}) with name: ${group.name}`,
      LogContexts.COMMUNITY
    );
    return group;
  }

  async initialiseMembers(group: IUserGroup): Promise<IUserGroup> {
    if (!group.members) {
      group.members = [];
    }
    if (!group.profile) {
      group.profile = await this.profileService.createProfile();
    }

    return group;
  }

  async removeUserGroup(groupID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const group = await this.groupRepository.findOne({
      where: { id: groupID },
    });
    if (!group)
      throw new Error(
        `Not able to locate User Group with the specified ID: ${group}`
      );

    await this.groupRepository.remove(group);
    return true;
  }

  //toDo vyanakiev - fix this
  async getGroups(groupable: IGroupable): Promise<IUserGroup[]> {
    if (groupable instanceof Ecoverse) {
      return await this.groupRepository.find({
        where: { ecoverse: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }
    if (groupable instanceof Challenge) {
      return await this.groupRepository.find({
        where: { challenge: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }
    if (groupable instanceof Organisation) {
      return await this.groupRepository.find({
        where: { organisation: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }
    if (groupable instanceof Opportunity) {
      return await this.groupRepository.find({
        where: { opportunity: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }

    return [];
  }

  async assignFocalPoint(userID: number, groupID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      this.logger.verbose(msg, LogContexts.COMMUNITY);
      throw new Error(msg);
    }

    const group = (await this.getGroupByID(groupID)) as UserGroup;
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      this.logger.verbose(msg, LogContexts.COMMUNITY);
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

  async addUser(userID: number, groupID: number): Promise<boolean> {
    const user = (await this.userService.getUserByID(userID)) as IUser;
    if (!user) throw new Error(`No user with id ${userID} was found!`);

    const group = (await this.getGroupByID(groupID)) as IUserGroup;
    if (!group) throw new Error(`No group with id ${groupID} was found!`);
    return await this.addUserToGroup(user, group);
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
    const group = await this.groupRepository.findOne({ id: groupID });
    if (group) return true;
    else return false;
  }

  async addUserToGroup(user: IUser, group: IUserGroup): Promise<boolean> {
    const entityManager = getManager();
    const rawData = await entityManager.query(
      `SELECT * from user_group_members where userId=${user.id} and userGroupId=${group.id}`
    );

    if (rawData.length > 0) {
      this.logger.verbose(
        `User ${user.email} already exists in group ${group.name}!`,
        LogContexts.COMMUNITY
      );
      return false;
    }
    const res = await getConnection()
      .createQueryBuilder()
      .insert()
      .into('user_group_members')
      .values({
        userGroupId: group.id,
        userId: user.id,
      })
      .execute();

    //this is a bit hacky
    if (res.identifiers.length === 0)
      throw new Error('Unable to add user to groups!');

    return true;
  }

  async removeUser(userID: number, groupID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      this.logger.verbose(msg, LogContexts.COMMUNITY);
      throw new Error(msg);
    }

    // Note that also need to have ecoverse member to be able to avoid this path for removing users as members
    const group = await this.getGroupByID(groupID, {
      relations: ['members', 'ecoverse'],
    });
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      this.logger.verbose(msg, LogContexts.COMMUNITY);
      throw new Error(msg);
    }

    // Check that the group being removed from is not the ecoverse members group, would leave the ecoverse in an inconsistent state
    if (group.name === RestrictedGroupNames.Members) {
      // Check if ecoverse members
      if (group.ecoverse)
        throw new Error(
          `Attempting to remove a user from the ecoverse members group: ${groupID}`
        );
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
      await this.removeFocalPoint(group.id);
    }

    await this.groupRepository.save(group);

    return group;
  }

  async removeFocalPoint(groupID: number): Promise<IUserGroup> {
    const group = (await this.getGroupByID(groupID)) as UserGroup;
    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      this.logger.verbose(msg, LogContexts.COMMUNITY);
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
    if (groupable instanceof Opportunity) {
      return (await this.groupRepository.findOne({
        where: { opportunity: { id: groupable.id }, name: name },
        relations: ['opportunity', 'members'],
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
      const newGroup = await this.createUserGroup(groupToAdd);
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
      this.logger.verbose(
        `Attempting to add group that already exists: ${name}`,
        LogContexts.COMMUNITY
      );
      return await this.getGroupByName(groupable, name);
    }

    if (groupable.restrictedGroupNames?.includes(name)) {
      this.logger.verbose(
        `Attempted to create a usergroup using a restricted name: ${name}`,
        LogContexts.COMMUNITY
      );
      throw new Error(
        'Unable to create user group with restricted name: ' + { name }
      );
    }

    const newGroup = await this.createUserGroup(name);
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
      const group = await this.createUserGroup(name);
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
