import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  AssignUserGroupMemberInput,
  DeleteUserGroupInput,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserInfo } from '@core/authentication';
@Resolver()
export class UserGroupResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private groupService: UserGroupService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Deletes the specified User Group.',
  })
  async deleteUserGroup(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group delete: ${group.name}`
    );
    return await this.groupService.removeUserGroup(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Updates the specified User Group.',
  })
  @Profiling.api
  async updateUserGroup(
    @CurrentUser() userInfo: UserInfo,
    @Args('userGroupData') userGroupData: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(userGroupData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      group.authorization,
      AuthorizationPrivilege.UPDATE,
      `user group update: ${group.name}`
    );
    return await this.groupService.updateUserGroup(userGroupData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Assigns a User as a member of the specified User Group.',
  })
  @Profiling.api
  async assignUserToGroup(
    @CurrentUser() userInfo: UserInfo,
    @Args('membershipData') membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group assign user: ${group.name}`
    );
    return await this.groupService.assignUser(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Removes the specified User from specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @CurrentUser() userInfo: UserInfo,
    @Args('membershipData') membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group remove user: ${group.name}`
    );
    return await this.groupService.removeUser(membershipData);
  }
}
