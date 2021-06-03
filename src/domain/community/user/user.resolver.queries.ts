import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { AuthenticationException } from '@common/exceptions';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(private userService: UserService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(): Promise<IUser[]> {
    return await this.userService.getUsers();
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(
    @Args('ID', { type: () => UUID_NAMEID_EMAIL }) id: string
  ): Promise<IUser> {
    return await this.userService.getUserOrFail(id);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @Args({ name: 'IDs', type: () => [UUID_NAMEID_EMAIL] }) ids: string[]
  ): Promise<IUser[]> {
    const users = await this.userService.getUsers();
    return users.filter(x => {
      return ids ? ids.indexOf(x.id) > -1 : false;
    });
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'The currently logged in user',
  })
  @Profiling.api
  async me(@CurrentUser() agentInfo: AgentInfo): Promise<IUser> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user.'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserNotRegisteredException();
    }
    return user;
  }
}
