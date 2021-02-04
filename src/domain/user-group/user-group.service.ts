import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '@interfaces/groupable.interface';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { Organisation } from '@domain/organisation/organisation.entity';
import { ProfileService } from '@domain/profile/profile.service';
import { IUser } from '@domain/user/user.interface';
import { UserService } from '@domain/user/user.service';
import { RestrictedGroupNames, UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { getConnection } from 'typeorm';
import { getManager } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@utils/logging/logging.contexts';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { UserGroupParent } from './user-group-parent.dto';
import {
  EntityNotFoundException,
  ValidationException,
  NotSupportedException,
  GroupNotInitializedException,
  EntityNotInitializedException,
} from '@utils/error-handling/exceptions';
import { UserGroupInput } from './user-group.dto';

@Injectable()
export class UserGroupService {
  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(name: string): Promise<IUserGroup> {
    if (name.length == 0)
      throw new ValidationException(
        'Unable to create a group with an empty name',
        LogContext.COMMUNITY
      );
    const group = new UserGroup(name);
    await this.initialiseMembers(group);
    await this.groupRepository.save(group);
    this.logger.verbose?.(
      `Created new group (${group.id}) with name: ${group.name}`,
      LogContext.COMMUNITY
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

  async removeUserGroup(
    groupID: number,
    checkForRestricted = false
  ): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const group = (await this.getUserGroupOrFail(groupID)) as UserGroup;

    // Cannot remove restricted groups
    if (checkForRestricted && (await this.isRestricted(group)))
      throw new ValidationException(
        `Unable to remove User Group with the specified ID: ${group.id}; restricted group: ${group.name}`,
        LogContext.COMMUNITY
      );

    await this.groupRepository.remove(group);
    return true;
  }

  // Note: explicitly do not support updating of email addresses
  async updateUserGroup(
    groupID: number,
    userGroupInput: UserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(groupID);

    // Cannot rename restricted groups
    const newName = userGroupInput.name;
    if (newName && newName.length > 0 && newName !== group.name) {
      // group being renamed; check if allowed
      if (await this.isRestricted(group as UserGroup)) {
        throw new ValidationException(
          `Unable to rename User Group with the specified ID: ${group.id}; restricted group: ${group.name}`,
          LogContext.COMMUNITY
        );
      } else if (
        await this.isRestrictedGroupName(group as UserGroup, newName)
      ) {
        throw new ValidationException(
          `Unable to rename User Group with the specified ID: ${group.id}; new name is a restricted name: ${newName}`,
          LogContext.COMMUNITY
        );
      } else {
        group.name = newName;
        await this.groupRepository.save(group);
      }
    }

    // Check the tagsets
    if (userGroupInput.profileData && group.profile) {
      await this.profileService.updateProfile(
        group.profile.id,
        userGroupInput.profileData
      );
    }

    const populatedUserGroup = await this.getUserGroupOrFail(group.id);

    return populatedUserGroup;
  }

  async isRestricted(group: UserGroup): Promise<boolean> {
    return await this.isRestrictedGroupName(group, group.name);
  }

  async isRestrictedGroupName(
    group: UserGroup,
    groupName: string
  ): Promise<boolean> {
    const parent: IGroupable = await this.getParent(group);
    if (parent.restrictedGroupNames?.includes(groupName)) {
      return true;
    }
    return false;
  }

  async getParent(group: UserGroup): Promise<typeof UserGroupParent> {
    const groupWithParent = (await this.getUserGroupOrFail(group.id, {
      relations: ['ecoverse', 'challenge', 'organisation', 'opportunity'],
    })) as UserGroup;
    if (groupWithParent?.ecoverse) return groupWithParent?.ecoverse;
    if (groupWithParent?.challenge) return groupWithParent?.challenge;
    if (groupWithParent?.opportunity) return groupWithParent?.opportunity;
    if (groupWithParent?.organisation) return groupWithParent?.organisation;
    throw new EntityNotFoundException(
      `Unable to locate parent for user group: ${group.name}`,
      LogContext.COMMUNITY
    );
  }

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
    const user = await this.userService.getUserByIdOrFail(userID);
    const group = await this.getUserGroupOrFail(groupID);

    // Add the user to the group if not already a member
    await this.addUserToGroup(user, group);

    // Have both user + group so do the add
    group.focalPoint = user;
    await this.groupRepository.save(group);

    return group;
  }

  async getUserGroupOrFail(
    groupID: number,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup> {
    //const t1 = performance.now()
    const group = await this.groupRepository.findOne({ id: groupID }, options);
    if (!group)
      throw new EntityNotFoundException(
        `Unable to find group with ID: ${groupID}`,
        LogContext.COMMUNITY
      );
    return group;
  }

  async addUser(userID: number, groupID: number): Promise<boolean> {
    const user = await this.userService.getUserByIdOrFail(userID);

    const group = await this.getUserGroupOrFail(groupID);

    return await this.addUserToGroup(user, group);
  }

  async isUserGroupMember(userID: number, groupID: number): Promise<boolean> {
    await this.userService.getUserByIdOrFail(userID);
    await this.getUserGroupOrFail(groupID);

    const userGroup = await this.groupRepository.findOne({
      where: { members: { id: userID }, id: groupID },
      relations: ['members'],
    });

    const members = userGroup?.members;
    if (!members || members.length === 0) return false;

    return true;
  }

  async addUserToGroup(user: IUser, group: IUserGroup): Promise<boolean> {
    const entityManager = getManager();
    const rawData = await entityManager.query(
      `SELECT * from user_group_members where userId=${user.id} and userGroupId=${group.id}`
    );

    if (rawData.length > 0) {
      this.logger.verbose?.(
        `User ${user.email} already exists in group ${group.name}!`,
        LogContext.COMMUNITY
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
      throw new ValidationException(
        'Unable to add user to groups!',
        LogContext.COMMUNITY
      );

    return true;
  }

  async removeUser(userID: number, groupID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(userID);

    // Note that also need to have ecoverse member to be able to avoid this path for removing users as members
    const group = await this.getUserGroupOrFail(groupID, {
      relations: ['members', 'ecoverse'],
    });

    // Check that the group being removed from is not the ecoverse members group, would leave the ecoverse in an inconsistent state
    if (group.name === RestrictedGroupNames.Members) {
      // Check if ecoverse members
      if (group.ecoverse)
        throw new NotSupportedException(
          `Attempting to remove a user from the ecoverse members group: ${groupID}`,
          LogContext.COMMUNITY
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
    if (!group.members)
      throw new GroupNotInitializedException(
        'Members not initialised',
        LogContext.COMMUNITY
      );

    group.members = group.members.filter(member => !(member.id === user.id));

    // Also remove the user from being a focal point
    if (group.focalPoint && group.focalPoint.id === user.id) {
      await this.removeFocalPoint(group.id);
    }

    await this.groupRepository.save(group);

    return group;
  }

  async removeFocalPoint(groupID: number): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(groupID);
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

    throw new NotSupportedException(
      'Unrecognized groupabble type!',
      LogContext.COMMUNITY
    );
  }

  async addMandatoryGroups(
    groupable: IGroupable,
    mandatoryGroupNames: string[]
  ): Promise<IGroupable> {
    if (!groupable.groups)
      throw new EntityNotInitializedException(
        'Non-initialised Groupable submitted',
        LogContext.COMMUNITY
      );

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
      groupable.groups.push(newGroup);
    }

    return groupable;
  }

  hasGroupWithName(groupable: IGroupable, name: string): boolean {
    // Double check groups array is initialised
    if (!groupable.groups) {
      throw new EntityNotInitializedException(
        'Non-initialised Groupable submitted',
        LogContext.COMMUNITY
      );
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
      throw new NotSupportedException(
        `Unable to create user group as parent already has a group with the given name: ${name}`,
        LogContext.COMMUNITY
      );
    }

    if (groupable.restrictedGroupNames?.includes(name)) {
      throw new NotSupportedException(
        `Unable to create user group with restricted name: ${name}`,
        LogContext.COMMUNITY
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
      throw new GroupNotInitializedException(
        'No restricted group names found!',
        LogContext.COMMUNITY
      );
    }
    return groupable.groups;
  }

  async getMembers(groupID: number): Promise<IUser[]> {
    const group = await this.getUserGroupOrFail(groupID, {
      relations: ['members', 'profile'],
    });
    return group?.members as IUser[];
  }
}
