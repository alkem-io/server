import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { ProfileService } from '@domain/community/profile/profile.service';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  NotSupportedException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  UpdateUserGroupInput,
  UserGroup,
  IUserGroup,
  AssignUserGroupMemberInput,
  RemoveUserGroupMemberInput,
  DeleteUserGroupInput,
  CreateUserGroupInput,
} from '@domain/community/user-group';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { IProfile } from '@domain/community/profile';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class UserGroupService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private userService: UserService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private agentService: AgentService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(
    userGroupData: CreateUserGroupInput,
    ecoverseID = ''
  ): Promise<IUserGroup> {
    this.validateName(userGroupData.name);
    const group = UserGroup.create(userGroupData);
    group.ecoverseID = ecoverseID;
    group.authorization = new AuthorizationDefinition();

    (group as IUserGroup).profile = await this.profileService.createProfile(
      userGroupData.profileData
    );
    const savedUserGroup = await this.userGroupRepository.save(group);
    this.logger.verbose?.(
      `Created new group (${group.id}) with name: ${group.name}`,
      LogContext.COMMUNITY
    );
    return savedUserGroup;
  }

  validateName(name: string) {
    if (name.trim().length < 2) {
      throw new ValidationException(
        `UserGroup name has a minimum length of 2: ${name}`,
        LogContext.COMMUNITY
      );
    }
  }

  async removeUserGroup(deleteData: DeleteUserGroupInput): Promise<IUserGroup> {
    const groupID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const group = (await this.getUserGroupOrFail(groupID)) as UserGroup;

    if (group.profile) {
      await this.profileService.deleteProfile(group.profile.id);
    }

    if (group.authorization)
      await this.authorizationDefinitionService.delete(group.authorization);

    const { id } = group;
    const result = await this.userGroupRepository.remove(group);
    return {
      ...result,
      id,
    };
  }

  async updateUserGroup(
    userGroupInput: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(userGroupInput.ID);

    const newName = userGroupInput.name;
    if (newName && newName.length > 0 && newName !== group.name) {
      this.validateName(newName);
      group.name = newName;
    }

    if (userGroupInput.profileData) {
      group.profile = await this.profileService.updateProfile(
        userGroupInput.profileData
      );
    }

    return await this.userGroupRepository.save(group);
  }

  async saveUserGroup(group: IUserGroup): Promise<IUserGroup> {
    return await this.userGroupRepository.save(group);
  }

  async getParent(group: IUserGroup): Promise<IGroupable> {
    const groupWithParent = (await this.getUserGroupOrFail(group.id, {
      relations: ['community', 'organisation'],
    })) as UserGroup;
    if (groupWithParent?.community) return groupWithParent?.community;
    if (groupWithParent?.organisation) return groupWithParent?.organisation;
    throw new EntityNotFoundException(
      `Unable to locate parent for user group: ${group.name}`,
      LogContext.COMMUNITY
    );
  }

  async getUserGroupOrFail(
    groupID: string,
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
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.UserGroupMember,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: ['community'],
    });
  }

  async isMember(userID: string, groupID: string): Promise<boolean> {
    const agent = await this.userService.getUserWithAgent(userID);

    return await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.UserGroupMember,
      resourceID: groupID,
    });
  }

  async removeUser(
    membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.UserGroupMember,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: ['community'],
    });
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
    name: string,
    ecoverseID?: string
  ): Promise<IUserGroup> {
    // Check if the group already exists, if so log a warning
    const alreadyExists = this.hasGroupWithName(groupable, name);
    if (alreadyExists) {
      throw new NotSupportedException(
        `Unable to create user group as parent already has a group with the given name: ${name}`,
        LogContext.COMMUNITY
      );
    }

    const newGroup = await this.createUserGroup(
      {
        name: name,
        parentID: groupable.id,
      },
      ecoverseID
    );
    await groupable.groups?.push(newGroup);
    return newGroup;
  }

  async getMembers(groupID: string): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.UserGroupMember,
      resourceID: groupID,
    });
  }

  async getGroups(
    conditions?: FindConditions<UserGroup>
  ): Promise<IUserGroup[]> {
    return (await this.userGroupRepository.find(conditions)) || [];
  }

  async getGroupsWithTag(
    tagFilter: string,
    conditions?: FindConditions<UserGroup>
  ): Promise<IUserGroup[]> {
    const groups = await this.getGroups(conditions);
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

  getProfile(userGroup: IUserGroup): IProfile {
    const profile = userGroup.profile;
    if (!profile)
      throw new EntityNotInitializedException(
        `UserGroup Profile not initialized: ${userGroup.id}`,
        LogContext.COMMUNITY
      );
    return profile;
  }
}
