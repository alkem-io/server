import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';

@Resolver()
export class UserGroupResolver {
  constructor(private groupService: UserGroupService) {}

  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier to the specified user group',
  })
  async addUserToGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = this.groupService.addUser(userID, groupID);
    return group;
  }

  @Mutation(() => UserGroup, {
    description:
      'Remove the user with the given identifier to the specified user group',
  })
  async removeUserFromGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = this.groupService.removeUser(userID, groupID);
    return group;
  }

  @Mutation(() => UserGroup, {
    nullable: true,
    description:
      'Assign the user with the given ID as focal point for the given group',
  })
  async assignGroupFocalPoint(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = this.groupService.assignFocalPoint(userID, groupID);
    return group;
  }

  @Mutation(() => UserGroup, {
    nullable: true,
    description: 'Remove the focal point for the given group',
  })
  async removeGroupFocalPoint(
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = this.groupService.removeFocalPoint(groupID);
    return group;
  }
}
