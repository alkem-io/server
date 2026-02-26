import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  AssignUserGroupMemberInput,
  DeleteUserGroupInput,
  RemoveUserGroupMemberInput,
  UpdateUserGroupInput,
} from '@domain/community/user-group/dto';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';

@InstrumentResolver()
@Resolver()
export class UserGroupResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private groupService: UserGroupService
  ) {}

  @Mutation(() => IUserGroup, {
    description: 'Deletes the specified User Group.',
  })
  async deleteUserGroup(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group delete: ${group.id}`
    );
    return await this.groupService.removeUserGroup(deleteData);
  }

  @Mutation(() => IUserGroup, {
    description: 'Updates the specified User Group.',
  })
  @Profiling.api
  async updateUserGroup(
    @CurrentActor() actorContext: ActorContext,
    @Args('userGroupData') userGroupData: UpdateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(userGroupData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      group.authorization,
      AuthorizationPrivilege.UPDATE,
      `user group update: ${group.id}`
    );
    return await this.groupService.updateUserGroup(userGroupData);
  }

  @Mutation(() => IUserGroup, {
    description: 'Assigns a User as a member of the specified User Group.',
  })
  @Profiling.api
  async assignUserToGroup(
    @CurrentActor() actorContext: ActorContext,
    @Args('membershipData') membershipData: AssignUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      group.authorization,
      AuthorizationPrivilege.GRANT,
      `Assign user to group: ${group.id}`
    );
    return await this.groupService.assignUser(membershipData);
  }

  @Mutation(() => IUserGroup, {
    description: 'Removes the specified User from specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @CurrentActor() actorContext: ActorContext,
    @Args('membershipData') membershipData: RemoveUserGroupMemberInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(
      membershipData.groupID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      group.authorization,
      AuthorizationPrivilege.DELETE,
      `user group remove user: ${group.id}`
    );
    return await this.groupService.removeUser(membershipData);
  }
}
