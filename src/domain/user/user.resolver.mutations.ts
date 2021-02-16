import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { CurrentUser } from '../../utils/decorators/user.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { UserFactoryService } from './user.factory.service';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(
    private userFactoryService: UserFactoryService,
    private userService: UserService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
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

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Update user profile.',
  })
  @Profiling.api
  async updateMyProfile(
    @Args('userData') userData: UserInput,
    @CurrentUser() email?: string
  ): Promise<IUser> {
    if (!email) throw new AuthenticationException('User not authenticated!');
    if (email !== userData.email)
      throw new AuthenticationException(
        `Unable to update Profile: current user email (${email}) does not match email provided: ${userData.email}`
      );
    const user = await this.userService.updateUserByEmail(email, userData);
    return user;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Creates a new user profile.',
  })
  @Profiling.api
  async createUser(@Args('userData') userData: UserInput): Promise<IUser> {
    const user = await this.userFactoryService.createUser(userData);
    return user;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Removes the specified user profile.',
  })
  @Profiling.api
  async removeUser(@Args('userID') userID: number): Promise<IUser> {
    const user = await this.userFactoryService.removeUser(userID);
    return user;
  }
}
