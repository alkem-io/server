import { CurrentUser, Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from './authorization.service';
import {
  GraphqlGuard,
  UsersWithAuthorizationCredentialInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication/agent-info';

@Resolver()
export class AuthorizationResolverQueries {
  private authorizationQueriesPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private authorizationService: AuthorizationService
  ) {
    this.authorizationQueriesPolicy =
      this.authorizationEngine.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.REGISTERED],
        [AuthorizationPrivilege.READ]
      );
  }

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
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationQueriesPolicy,
      AuthorizationPrivilege.READ,
      `authorization query: ${agentInfo.email}`
    );
    return await this.authorizationService.usersWithCredentials(
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
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationQueriesPolicy,
      AuthorizationPrivilege.READ,
      `authorization query: ${agentInfo.email}`
    );
    return await this.authorizationService.userAuthorizationPrivileges(
      userAuthorizationPrivilegesData
    );
  }
}
