import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getConnection, getManager, FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { ProfileService } from '@domain/community/profile/profile.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { UserGroupParent } from './user-group-parent.dto';
import {
  EntityNotFoundException,
  ValidationException,
  NotSupportedException,
  GroupNotInitializedException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Community } from '@domain/community/community';
import {
  UpdateUserGroupInput,
  UserGroup,
  IUserGroup,
  RemoveUserGroupFocalPoint,
  AssignUserGroupMemberInput,
  AssignUserGroupFocalPointInput,
  RemoveUserGroupMemberInput,
  DeleteUserGroupInput,
  CreateUserGroupInput,
} from '@domain/community/user-group';

import validator from 'validator';
import { TagsetService } from '@domain/common/tagset';

@Injectable()
export class UserGroupService {
  constructor(
    private userService: UserService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(
    userGroupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    await this.validateUserGroupCreationRequest(userGroupData);

    const group: IUserGroup = new UserGroup(userGroupData.name);
    group.members = [];
    group.profile = await this.profileService.createProfile(
      userGroupData.profileData
    );
    const savedUserGroup = await this.userGroupRepository.save(group);
    this.logger.verbose?.(
      `Created new group (${group.id}) with name: ${group.name}`,
      LogContext.COMMUNITY
    );
    return savedUserGroup;
  }

  async validateUserGroupCreationRequest(
    userGroupData: CreateUserGroupInput
  ): Promise<boolean> {
    const name = userGroupData.name;
    if (name.length == 0)
      throw new ValidationException(
        'Unable to create a group with an empty name',
        LogContext.COMMUNITY
      );
    return true;
  }

  async createUserGroupByName(name: string): Promise<IUserGroup> {
    const userGroupInput = new CreateUserGroupInput();
    userGroupInput.name = name;
    return await this.createUserGroup(userGroupInput);
  }

  async removeUserGroup(
    deleteData: DeleteUserGroupInput,
    checkForRestricted = false
  ): Promise<IUserGroup> {
    const groupID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const group = (await this.getUserGroupByIdOrFail(groupID)) as UserGroup;

    // Cannot remove restricted groups
    if (checkForRestricted && (await this.isRestricted(group)))
      throw new ValidationException(
        `Unable to remove User Group with the specified ID: ${group.id}; restricted group: ${group.name}`,
        LogContext.COMMUNITY
      );

    if (group.profile) {
      await this.profileService.deleteProfile(group.profile.id);
    }

    const { id } = group;
    const result = await this.userGroupRepository.remove(group);
    return {
      ...result,
      id,
    };
  }

  // Note: explicitly do not support updating of email addresses
  async updateUserGroup(
    userGroupInput: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(userGroupInput.ID);

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
        await this.userGroupRepository.save(group);
      }
    }

    // Check the tagsets
    if (userGroupInput.profileData && group.profile) {
      await this.profileService.updateProfile(userGroupInput.profileData);
    }

    const populatedUserGroup = await this.getUserGroupByIdOrFail(group.id);

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
    const groupWithParent = (await this.getUserGroupByIdOrFail(group.id, {
      relations: ['community', 'organisation'],
    })) as UserGroup;
    if (groupWithParent?.community) return groupWithParent?.community;
    if (groupWithParent?.organisation) return groupWithParent?.organisation;
    throw new EntityNotFoundException(
      `Unable to locate parent for user group: ${group.name}`,
      LogContext.COMMUNITY
    );
  }

  async getGroupsOnGroupable(groupable: IGroupable): Promise<IUserGroup[]> {
    if (groupable instanceof Community) {
      return await this.userGroupRepository.find({
        where: { community: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }

    if (groupable instanceof Organisation) {
      return await this.userGroupRepository.find({
        where: { organisation: { id: groupable.id } },
        relations: ['members', 'focalPoint'],
      });
    }

    return [];
  }

  async assignFocalPoint(
    membershipData: AssignUserGroupFocalPointInput
  ): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(
      membershipData.userID
    );
    const group = await this.getUserGroupByIdOrFail(membershipData.groupID);

    // Add the user to the group if not already a member
    await this.addUserToGroup(user, group);

    // Have both user + group so do the add
    group.focalPoint = user;
    await this.userGroupRepository.save(group);

    return group;
  }

  async getUserGroupOrFail(
    groupID: string,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup> {
    if (validator.isNumeric(groupID)) {
      const idInt: number = parseInt(groupID);
      return await this.getUserGroupByIdOrFail(idInt, options);
    }

    throw new EntityNotFoundException(
      `Unable to find group with ID: ${groupID}`,
      LogContext.COMMUNITY
    );
  }

  async getUserGroupByIdOrFail(
    groupID: number,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup> {
    //const t1 = performance.now()
    const group = await this.userGroupRepository.findOne(
      { id: groupID },
      options
    );
    if (!group)
      throw new EntityNotFoundException(
        `Unable to find group with ID: ${groupID}`,
        LogContext.COMMUNITY
      );
    return group;
  }

  async assignUser(
    membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const user = await this.userService.getUserByIdOrFail(
      membershipData.userID
    );

    const group = await this.getUserGroupByIdOrFail(membershipData.groupID);

    await this.addUserToGroup(user, group);
    return await this.getUserGroupByIdOrFail(group.id);
  }

  async isUserGroupMember(userID: number, groupID: number): Promise<boolean> {
    await this.userService.getUserByIdOrFail(userID);
    await this.getUserGroupByIdOrFail(groupID);

    const userGroup = await this.userGroupRepository.findOne({
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
      `SELECT * from user_group_members where userId=${user.id} and userGroupId= ${group.id}`
    );

    if (rawData.length > 0) {
      this.logger.verbose?.(
        `User ${user.email} already exists in group  ${group.name}!`,
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

  async removeUser(
    membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(
      membershipData.userID
    );

    // Note that also need to have ecoverse member to be able to avoid this path for removing users as members
    const group = await this.getUserGroupByIdOrFail(membershipData.groupID, {
      relations: ['members', 'community'],
    });

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
      await this.removeFocalPoint({ groupID: group.id });
    }

    await this.userGroupRepository.save(group);

    return group;
  }

  async removeFocalPoint(
    removeData: RemoveUserGroupFocalPoint
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupByIdOrFail(removeData.groupID);
    // Set focalPoint to NULL will remove the relation.
    // For typeorm 'undefined' means - 'Not changed'
    // More information: https://github.com/typeorm/typeorm/issues/5454
    group.focalPoint = null;

    await this.userGroupRepository.save(group);

    return group;
  }

  async getGroupByName(
    groupable: IGroupable,
    name: string
  ): Promise<IUserGroup> {
    if (groupable instanceof Organisation) {
      return (await this.userGroupRepository.findOne({
        where: { organisation: { id: groupable.id }, name: name },
        relations: ['organisation', 'members'],
      })) as IUserGroup;
    }
    if (groupable instanceof Community) {
      return (await this.userGroupRepository.findOne({
        where: { community: { id: groupable.id }, name: name },
        relations: ['community', 'members'],
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
      const newGroup = await this.createUserGroupByName(groupToAdd);
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

    const newGroup = await this.createUserGroupByName(name);
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
      const group = await this.createUserGroupByName(name);
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
    const group = await this.getUserGroupByIdOrFail(groupID, {
      relations: ['members', 'profile'],
    });
    return group?.members as IUser[];
  }

  async getGroups(): Promise<IUserGroup[]> {
    return (await this.userGroupRepository.find()) || [];
  }

  async getGroupsWithTag(tagFilter: string): Promise<IUserGroup[]> {
    const groups = await this.getGroups();
    return groups.filter(g => {
      if (!tagFilter) {
        return true;
      }

      if (!g.profile) return false;

      const tagset = this.tagsetService.defaultTagset(g.profile);

      return (
        tagset !== undefined && this.tagsetService.hasTag(tagset, tagFilter)
      );
    });
  }
}
