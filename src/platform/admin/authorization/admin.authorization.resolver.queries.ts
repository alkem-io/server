import { CurrentUser, Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AuthorizationPrivilege } from '@common/enums';
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { AdminAuthorizationService } from './admin.authorization.service';
import { UsersWithAuthorizationCredentialInput } from './dto/authorization.dto.users.with.credential';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';

@Resolver()
export class AdminAuthorizationResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [IUser], {
    nullable: false,
    description:
      'All Users that hold credentials matching the supplied criteria.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async usersWithAuthorizationCredential(
    @Args('credentialsCriteriaData', { nullable: false })
    credentialsCriteriaData: UsersWithAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `authorization query: ${agentInfo.email}`
    );
    return await this.adminAuthorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }

  @Query(() => [AuthorizationPrivilege], {
    nullable: false,
    description:
      'Privileges assigned to a User (based on held credentials) given an Authorization defnition.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async userAuthorizationPrivileges(
    @Args('userAuthorizationPrivilegesData', { nullable: false })
    userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AuthorizationPrivilege[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `authorization query: ${agentInfo.email}`
    );
    return await this.adminAuthorizationService.userAuthorizationPrivileges(
      agentInfo,
      userAuthorizationPrivilegesData
    );
  }
}
