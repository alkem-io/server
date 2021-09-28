import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { AuthenticationException } from '@common/exceptions';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';

@Resolver(() => IUser)
export class UserResolverQueries {
  private queryAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private userService: UserService
  ) {
    this.queryAuthorizationPolicy =
      this.authorizationEngine.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.REGISTERED],
        [AuthorizationPrivilege.READ]
      );
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(@CurrentUser() agentInfo: AgentInfo): Promise<IUser[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.queryAuthorizationPolicy,
      `users query: ${agentInfo.email}`
    );
    return await this.userService.getUsers();
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID_NAMEID_EMAIL }) id: string
  ): Promise<IUser> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.queryAuthorizationPolicy,
      `user query: ${agentInfo.email}`
    );
    return await this.userService.getUserOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'IDs', type: () => [UUID_NAMEID_EMAIL] }) ids: string[]
  ): Promise<IUser[]> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.queryAuthorizationPolicy,
      `users query: ${agentInfo.email}`
    );
    const users = await this.userService.getUsers();
    return users.filter(x => {
      return ids ? ids.indexOf(x.id) > -1 : false;
    });
  }

  @UseGuards(GraphqlGuard)
  @Query(() => Boolean, {
    nullable: false,
    description: 'Check if the currently logged in user has a User profile',
  })
  @Profiling.api
  async meHasProfile(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    const email = agentInfo.email;
    if (!email || email.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      return false;
    }
    return true;
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
        'Unable to retrieve authenticated user; no identifier'
      );
    }
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserNotRegisteredException();
    }
    return user;
  }
}
