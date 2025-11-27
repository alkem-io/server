import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CredentialMetadataOutput } from '@domain/agent/verified-credential/dto/verified.credential.dto.metadata';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { PaginatedUsers, PaginationArgs } from '@core/pagination';
import { UserService } from './user.service';
import { IUser } from './user.interface';
import { UserFilterInput } from '@core/filtering';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { UsersQueryArgs } from './dto/users.query.args';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private userService: UserService,
    private agentService: AgentService
  ) {}

  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: UsersQueryArgs
  ): Promise<IUser[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.userID}`
    );
    return await this.userService.getUsersForQuery(args);
  }

  @Query(() => PaginatedUsers, {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  @Profiling.api
  async usersPaginated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args({
      name: 'withTags',
      nullable: true,
      description: 'Return only users with tags',
    })
    withTags?: boolean,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${agentInfo.userID}`
    );

    return this.userService.getPaginatedUsers(pagination, withTags, filter);
  }

  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IUser> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user query: ${agentInfo.userID}`
    );
    return await this.userService.getUserOrFail(id);
  }

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
