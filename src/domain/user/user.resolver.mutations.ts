import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorization/graphql.guard';
import { Roles } from '@utils/authorization/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';
import { AuthorizationRoles } from '@utils/authorization/authorization.roles';
import { SelfManagement } from '@utils/authorization/self.management.decorator';

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
  async createUser(@Args('userData') userData: UserInput): Promise<IUser> {
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
    @Args('userID') userID: number,
    @Args('userData') userData: UserInput
  ): Promise<IUser> {
    const user = await this.userService.updateUser(userID, userData);
    return user;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Removes the specified user profile.',
  })
  @Profiling.api
  async removeUser(@Args('userID') userID: number): Promise<IUser> {
    const user = await this.userService.removeUser(userID);
    return user;
  }
}
