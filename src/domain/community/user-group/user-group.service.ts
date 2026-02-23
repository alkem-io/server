import {
  AuthorizationCredential,
  LogContext,
  ProfileType,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
} from '@common/exceptions';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IUser } from '@domain/community/user/user.interface';
import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import {
  AssignUserGroupMemberInput,
  CreateUserGroupInput,
  DeleteUserGroupInput,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from './dto';

@Injectable()
export class UserGroupService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userLookupService: UserLookupService,
    private profileService: ProfileService,
    private actorService: ActorService,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(
    userGroupData: CreateUserGroupInput,
    storageAggregator: IStorageAggregator
  ): Promise<IUserGroup> {
    const group = UserGroup.create(userGroupData);
    group.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.USER_GROUP
    );

    (group as IUserGroup).profile = await this.profileService.createProfile(
      userGroupData.profile,
      ProfileType.USER_GROUP,
      storageAggregator
    );
    const savedUserGroup = await this.userGroupRepository.save(group);
    this.logger.verbose?.(
      `Created new group (${group.id}) with name: ${group.profile?.displayName}`,
      LogContext.COMMUNITY
    );
    return savedUserGroup;
  }
  async removeUserGroup(deleteData: DeleteUserGroupInput): Promise<IUserGroup> {
    const groupID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const group = (await this.getUserGroupOrFail(groupID)) as UserGroup;

    if (group.profile) {
      await this.profileService.deleteProfile(group.profile.id);
    }

    if (group.authorization)
      await this.authorizationPolicyService.delete(group.authorization);

    // Remove all issued membership credentials
    const members = await this.getMembers(group.id);
    for (const member of members) {
      await this.removeUser({ userID: member.id, groupID: group.id });
    }

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
    const group = await this.getUserGroupOrFail(userGroupInput.ID, {
      relations: { profile: true },
    });
    if (!group.profile) {
      throw new EntityNotFoundException(
        `Group profile not initialised: ${group.id}`,
        LogContext.COMMUNITY
      );
    }

    const newName = userGroupInput.name;
    if (
      newName &&
      newName.length > 0 &&
      newName !== group.profile.displayName
    ) {
      group.profile.displayName = newName;
    }

    if (userGroupInput.profileData) {
      group.profile = await this.profileService.updateProfile(
        group.profile,
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
      relations: { community: true, organization: true },
    })) as UserGroup;
    if (groupWithParent?.community) return groupWithParent?.community;
    if (groupWithParent?.organization) return groupWithParent?.organization;
    throw new EntityNotFoundException(
      `Unable to locate parent for user group: ${group.profile?.displayName}`,
      LogContext.COMMUNITY
    );
  }

  async getUserGroupOrFail(
    groupID: string,
    options?: FindOneOptions<UserGroup>
  ): Promise<IUserGroup | never> {
    //const t1 = performance.now()

    const group = await this.userGroupRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: groupID,
      },
    });

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
    const user = await this.userLookupService.getUserByIdOrFail(
      membershipData.userID
    );

    // User IS an Actor - use user.id as actorID
    await this.actorService.grantCredentialOrFail(user.id, {
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: { community: true },
    });
  }

  async removeUser(
    membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const user = await this.userLookupService.getUserByIdOrFail(
      membershipData.userID
    );

    // User IS an Actor - use user.id as actorID
    await this.actorService.revokeCredential(user.id, {
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      relations: { community: true },
    });
  }

  private hasGroupWithName(groupable: IGroupable, name: string): boolean {
    // Double check groups array is initialised
    if (!groupable.groups) {
      throw new EntityNotInitializedException(
        'Non-initialised Groupable submitted',
        LogContext.COMMUNITY
      );
    }

    // Find the right group
    for (const group of groupable.groups) {
      if (group.profile?.displayName === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  async addGroupWithName(
    groupable: IGroupable,
    name: string,
    storageAggregator: IStorageAggregator
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
        parentID: groupable.id,
        profile: {
          displayName: name,
        },
      },
      storageAggregator
    );
    groupable.groups?.push(newGroup);
    return newGroup;
  }

  async getMembers(groupID: string): Promise<IUser[]> {
    return await this.userLookupService.usersWithCredential({
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: groupID,
    });
  }

  async getGroups(
    conditions?: FindManyOptions<UserGroup>
  ): Promise<IUserGroup[]> {
    return (await this.userGroupRepository.find(conditions)) || [];
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
