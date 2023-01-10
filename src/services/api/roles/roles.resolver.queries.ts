import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { RolesService } from './roles.service';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';

@Resolver()
export class RolesResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private rolesServices: RolesService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ContributorRoles, {
    nullable: false,
    description: 'The roles that that the specified User has.',
  })
  @Profiling.api
  async rolesUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('rolesData') rolesData: RolesUserInput
  ): Promise<ContributorRoles> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `roles user query: ${agentInfo.email}`
    );
    return await this.rolesServices.getUserRoles(rolesData);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => ContributorRoles, {
    description: 'The roles that the specified Organization has.',
  })
  @Profiling.api
  async rolesOrganization(
    @Args('rolesData') rolesData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    return await this.rolesServices.getOrganizationRoles(rolesData);
  }
}
