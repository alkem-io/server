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
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IUser } from '@domain/community/user/user.interface';
import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import {
  AssignUserGroupMemberInput,
  CreateUserGroupInput,
  DeleteUserGroupInput,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from './dto';
import { userGroups } from './user-group.schema';

@Injectable()
export class UserGroupService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userLookupService: UserLookupService,
    private profileService: ProfileService,
    private agentService: AgentService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserGroup(
    userGroupData: CreateUserGroupInput,
    storageAggregator: IStorageAggregator
  ): Promise<IUserGroup> {
    const group = UserGroup.create(userGroupData as unknown as Partial<UserGroup>);
    group.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.USER_GROUP
    );

    (group as IUserGroup).profile = await this.profileService.createProfile(
      userGroupData.profile,
      ProfileType.USER_GROUP,
      storageAggregator
    );
    const savedUserGroup = await this.saveUserGroup(group);
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
    await this.db.delete(userGroups).where(eq(userGroups.id, id));
    return {
      ...group,
      id,
    };
  }

  async updateUserGroup(
    userGroupInput: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.getUserGroupOrFail(userGroupInput.ID, {
      with: { profile: true },
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

    return await this.saveUserGroup(group);
  }

  async saveUserGroup(group: IUserGroup): Promise<IUserGroup> {
    if (group.id) {
      const [updated] = await this.db
        .update(userGroups)
        .set({
          profileId: group.profile?.id ?? null,
          authorizationId: group.authorization?.id ?? null,
          organizationId: (group as any).organization?.id ?? (group as any).organizationId ?? null,
          communityId: (group as any).community?.id ?? (group as any).communityId ?? null,
        })
        .where(eq(userGroups.id, group.id))
        .returning();
      return { ...group, ...updated } as unknown as IUserGroup;
    }
    const [inserted] = await this.db
      .insert(userGroups)
      .values({
        profileId: group.profile?.id ?? null,
        authorizationId: group.authorization?.id ?? null,
        organizationId: (group as any).organization?.id ?? (group as any).organizationId ?? null,
        communityId: (group as any).community?.id ?? (group as any).communityId ?? null,
      })
      .returning();
    return { ...group, ...inserted } as unknown as IUserGroup;
  }

  async getParent(group: IUserGroup): Promise<IGroupable> {
    const groupWithParent = (await this.getUserGroupOrFail(group.id, {
      with: { community: true, organization: true },
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
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IUserGroup | never> {
    const group = await this.db.query.userGroups.findFirst({
      where: eq(userGroups.id, groupID),
      with: options?.with,
    });

    if (!group)
      throw new EntityNotFoundException(
        `Unable to find group with ID: ${groupID}`,
        LogContext.COMMUNITY
      );
    return group as unknown as IUserGroup;
  }

  async assignUser(
    membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const { user, agent } = await this.userLookupService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.grantCredentialOrFail({
      agentID: agent.id,
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      with: { community: true },
    });
  }

  async removeUser(
    membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const { user, agent } = await this.userLookupService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: membershipData.groupID,
    });

    return await this.getUserGroupOrFail(membershipData.groupID, {
      with: { community: true },
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
    await groupable.groups?.push(newGroup);
    return newGroup;
  }

  async getMembers(groupID: string): Promise<IUser[]> {
    return await this.userLookupService.usersWithCredential({
      type: AuthorizationCredential.USER_GROUP_MEMBER,
      resourceID: groupID,
    });
  }

  async getGroups(
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IUserGroup[]> {
    const result = await this.db.query.userGroups.findMany({
      with: options?.with,
    });
    return (result as unknown as IUserGroup[]) || [];
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
