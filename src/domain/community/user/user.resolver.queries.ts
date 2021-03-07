import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@src/core/authorization/roles.decorator';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';
import { AuthenticationException } from '@src/common/error-handling/exceptions';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { CurrentUser } from '@src/core/authentication/current-user.decorator';
import { UserInfo } from '@src/core/authentication/user-info';

@Resolver(() => User)
export class UserResolverQueries {
  constructor(private userService: UserService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [User], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(): Promise<IUser[]> {
    return await this.userService.getUsers();
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  //should be in user queries
  @Query(() => User, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(@Args('ID') id: string): Promise<IUser> {
    return await this.userService.getUserOrFail(id);
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  //should be in user queries
  @Query(() => [User], {
    nullable: false,
    description: 'The users filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @Args({ name: 'IDs', type: () => [String] }) ids: string[]
  ): Promise<IUser[]> {
    const users = await this.userService.getUsers();
    return users.filter(x => {
      return ids ? ids.indexOf(x.id.toString()) > -1 : false;
    });
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => User, {
    nullable: false,
    description: 'The currently logged in user',
  })
  @Profiling.api
  async me(@CurrentUser() userInfo: UserInfo): Promise<IUser> {
    if (!userInfo) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user.'
      );
    }
    if (!userInfo.user) {
      throw new AuthenticationException('Unable to retrieve user profile.');
    }
    return userInfo.user;
  }
}
