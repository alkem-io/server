import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserGroup } from './user-group.entity';
import { IUserGroup } from './user-group.interface';
import { UserGroupService } from './user-group.service';

@Resolver()
export class UserGroupResolver {
  constructor(private groupService: UserGroupService) {}

  @Mutation(() => UserGroup, {
    nullable: true,
    description: 'Add the user to the group',
  })
  async addUserToGroup(
    @Args('userID') userID: number,
    @Args('groupID') groupID: number
  ): Promise<IUserGroup> {
    const group = this.groupService.addUser(userID, groupID);
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
}
