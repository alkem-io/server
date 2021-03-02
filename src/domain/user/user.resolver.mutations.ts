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
import {
  AuthenticationException,
  ForbiddenException,
} from '@utils/error-handling/exceptions';
import { UserService } from './user.service';
import { AuthService } from '@utils/auth/auth.service';
import { LogContext } from '@utils/logging/logging.contexts';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
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

  @Mutation(() => User, {
    description: 'Creates a new user profile on behalf of another user.',
  })
  @Profiling.api
  async createUser(
    @CurrentUser() email: string,
    @Args('userData') userData: UserInput
  ): Promise<IUser> {
    if (
      userData.email === email ||
      (await this.authService.isUserInRole(email, [
        RestrictedGroupNames.CommunityAdmins,
        RestrictedGroupNames.EcoverseAdmins,
      ]))
    )
      return await this.userService.createUser(userData);

    throw new ForbiddenException(
      `User ${email} doesn't have permissions to create profile with email ${userData.email}`,
      LogContext.AUTH
    );
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
    const user = await this.userService.removeUser(userID);
    return user;
  }
}
