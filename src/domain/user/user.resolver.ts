import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { CurrentUser } from '../../utils/decorators/user.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';
import { AuthenticationException } from '@utils/error-handling/exceptions';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

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
  @Query(() => User, {
    nullable: false,
    description: 'The currently logged in user',
  })
  @Profiling.api
  async me(@CurrentUser() email?: string): Promise<IUser> {
    // Having a token is mandatory for this method.
    // When authentication is turned off the authentication check is bypassed,
    // so if token is missng no error will be thrown.
    // This will handle that particular case.
    // https://github.com/cherrytwist/Client.Web/issues/411
    if (!email) throw new AuthenticationException('User not authenticated!');
    const user = await this.userService.getUserByEmail(email);
    return user as IUser;
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
}
