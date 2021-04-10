import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { SelfManagement } from '@common/decorators';
import {
  CreateUserInput,
  UpdateUserInput,
  User,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(private readonly userService: UserService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description:
      'Creates a new user profile on behalf of an admin or the user account owner.',
  })
  @Profiling.api
  async createUser(
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    return await this.userService.createUser(userData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description:
      'Update the base user information. Note: email address cannot be updated.',
  })
  @Profiling.api
  async updateUser(
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.updateUser(userData);
    return user;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Removes the specified user profile.',
  })
  @Profiling.api
  async deleteUser(
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    return await this.userService.removeUser(deleteData);
  }
}
