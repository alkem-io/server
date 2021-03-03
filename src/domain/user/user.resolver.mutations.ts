import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { UserService } from './user.service';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.service';
import { AuthenticatedUser } from '@utils/auth/authenticated.user.decorator';
import { AuthenticatedUserDTO } from '@utils/auth/authenticated.user.dto';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(private readonly userService: UserService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins,
    AuthorisationRoles.NewUser
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description:
      'Creates a new user profile on behalf of an admin or the user account owner.',
  })
  @Profiling.api
  async createUser(
    @AuthenticatedUser() authenticatedUser: AuthenticatedUserDTO,
    @Args('userData') userData: UserInput
  ): Promise<IUser> {
    if (authenticatedUser.newUser) {
      this.userService.validateAuthenitcatedUserSelfAccessOrFail(
        authenticatedUser,
        userData
      );
    }
    return await this.userService.createUser(userData);
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins,
    AuthorisationRoles.AuthenticatedUser
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

  //todo: this mutation should disappear
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Update user profile.',
  })
  @Profiling.api
  async updateMyProfile(
    @Args('userData') userData: UserInput,
    @AuthenticatedUser() authUser?: AuthenticatedUserDTO
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
