import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { UserService } from './user.service';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { AccountMap } from '@utils/auth/account.mapping.decorator';
import { AccountMapping } from '@utils/auth/account.mapping';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(private readonly userService: UserService) {}

  @Roles(
    AuthorisationRoles.CommunityAdmins,
    AuthorisationRoles.EcoverseAdmins,
    AuthorisationRoles.NewUser
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description:
      'Creates a new user profile on behalf of an admin or the user account owner.',
  })
  @Profiling.api
  async createUser(
    @AccountMap() accountMapping: AccountMapping,
    @Args('userData') userData: UserInput
  ): Promise<IUser> {
    if (accountMapping.newUser()) {
      this.userService.validateAuthenticatedUserSelfAccessOrFail(
        accountMapping,
        userData
      );
    }
    return await this.userService.createUser(userData);
  }

  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
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

  //todo: this mutation should disappear
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Update user profile.',
  })
  @Profiling.api
  async updateMyProfile(
    @Args('userData') userData: UserInput,
    @AccountMap() authUser?: AccountMapping
  ): Promise<IUser> {
    const email = authUser?.email;
    if (email !== userData.email)
      throw new AuthenticationException(
        `Unable to update Profile: current user email (${email}) does not match email provided: ${userData.email}`
      );
    const user = await this.userService.updateUserByEmail(email, userData);
    return user;
  }

  // todo: a user should be able to remove their own profile
  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
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
