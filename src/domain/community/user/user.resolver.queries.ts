import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CredentialMetadataOutput } from '@domain/agent/verified-credential/dto/verified.credential.dto.metadata';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { PaginatedUsers, PaginationArgs } from '@core/pagination';
import { UserService } from './user.service';
import { IUser } from './';
import { UserFilterInput } from '@core/filtering';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { UsersQueryArgs } from './dto/users.query.args';

@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private userService: UserService,
    private agentService: AgentService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: UsersQueryArgs
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );
    return await this.userService.getUsers(args);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => PaginatedUsers, {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async usersPaginated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.email}`
    );

    return this.userService.getPaginatedUsers(pagination, filter);
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user query: ${agentInfo.email}`
    );
    return await this.userService.getUserOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [CredentialMetadataOutput], {
    nullable: false,
    description: 'Get supported credential metadata',
  })
  @Profiling.api
  async getSupportedVerifiedCredentialMetadata(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CredentialMetadataOutput[]> {
    const userID = agentInfo.userID;
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier',
        LogContext.RESOLVER_QUERY
      );
    }

    return await this.agentService.getSupportedCredentialMetadata();
  }
}
