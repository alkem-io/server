import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import {
  AssignUserGroupMemberInput,
  AssignUserGroupFocalPointInput,
  DeleteUserGroupInput,
  RemoveUserGroupFocalPoint,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group';

@Resolver(() => UserGroup)
export class UserGroupResolverMutations {
  constructor(private groupService: UserGroupService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Removes the user group with the specified ID',
  })
  async deleteUserGroup(
    @Args('deleteData') deleteData: DeleteUserGroupInput
  ): Promise<IUserGroup> {
    return await this.groupService.removeUserGroup(deleteData, true);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Update the user group information.',
  })
  @Profiling.api
  async updateUserGroup(
    @Args('userGroupData') userGroupData: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    return await this.groupService.updateUserGroup(userGroupData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async assignUserToGroup(
    @Args('membershipData') membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    return await this.groupService.assignUser(membershipData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Remove the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @Args('membershipData') membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    return await this.groupService.removeUser(membershipData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description:
      'Assign the user with the given ID as focal point for the given group',
  })
  @Profiling.api
  async assignGroupFocalPoint(
    @Args('membershipData') membershipData: AssignUserGroupFocalPointInput
  ): Promise<IUserGroup> {
    return await this.groupService.assignFocalPoint(membershipData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description: 'Remove the focal point for the given group',
  })
  @Profiling.api
  async removeGroupFocalPoint(
    @Args('removeData') removeData: RemoveUserGroupFocalPoint
  ): Promise<IUserGroup> {
    const group = await this.groupService.removeFocalPoint(removeData);
    return group;
  }
}
