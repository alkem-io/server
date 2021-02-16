import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { CurrentUser } from '../../utils/decorators/user.decorator';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';
import { AuthenticationException } from '@utils/error-handling/exceptions';

@Resolver(() => User)
export class UserResolverQueries {
  constructor(private userService: UserService) {}

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [User], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(): Promise<IUser[]> {
    return await this.userService.getUsers();
  }

  @Roles(RestrictedGroupNames.Members)
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

  @Roles(RestrictedGroupNames.Members)
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
}
