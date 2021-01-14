import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { CurrentUser } from './user.decorator';
import { UserInput } from './user.dto';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';

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
  async me(@CurrentUser() email: string): Promise<IUser> {
    const user = await this.userService.getUserByEmail(email);
    return user as IUser;
  }
}
