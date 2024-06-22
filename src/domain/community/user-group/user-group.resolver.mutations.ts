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
} from '@domain/community/user-group/dto';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
@Resolver()
export class UserGroupResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private groupService: UserGroupService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Deletes the specified User Group.',
  })
  async deleteUserGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group delete: ${group.id}`
    );
    return await this.groupService.removeUserGroup(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Updates the specified User Group.',
  })
  @Profiling.api
  async updateUserGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userGroupData') userGroupData: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(userGroupData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      group.authorization,
      AuthorizationPrivilege.UPDATE,
      `user group update: ${group.id}`
    );
    return await this.groupService.updateUserGroup(userGroupData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Assigns a User as a member of the specified User Group.',
  })
  @Profiling.api
  async assignUserToGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      group.authorization,
      AuthorizationPrivilege.GRANT,
      `Assign user to group: ${group.id}`
    );
    return await this.groupService.assignUser(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Removes the specified User from specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group remove user: ${group.id}`
    );
    return await this.groupService.removeUser(membershipData);
  }
}
