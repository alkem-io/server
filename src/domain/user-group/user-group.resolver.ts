import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '@utils/decorators/roles.decorator';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { RestrictedGroupNames, UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { UserGroupInput } from './user-group.dto';

@Resolver(() => UserGroup)
export class UserGroupResolver {
  constructor(private groupService: UserGroupService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the user group with the specified ID',
  })
  async removeUserGroup(@Args('ID') groupID: number): Promise<boolean> {
    return await this.groupService.removeUserGroup(groupID, true);
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Update the user group information.',
  })
  @Profiling.api
  async updateUserGroup(
    @Args('ID') groupID: number,
    @Args('userGroupData') userGroupData: UserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.groupService.updateUserGroup(
      groupID,
      userGroupData
    );
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Adds the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async addUserToGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<boolean> {
    const res = await this.groupService.addUser(userID, groupID);
    return res;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Remove the user with the given identifier to the specified user group',
  })
  @Profiling.api
  async removeUserFromGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.removeUser(userID, groupID);
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description:
      'Assign the user with the given ID as focal point for the given group',
  })
  @Profiling.api
  async assignGroupFocalPoint(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.assignFocalPoint(userID, groupID);
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    nullable: true,
    description: 'Remove the focal point for the given group',
  })
  @Profiling.api
  async removeGroupFocalPoint(
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = await this.groupService.removeFocalPoint(groupID);
    return group;
  }
}
