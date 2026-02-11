import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { RolesVirtualContributorInput } from './dto/roles.dto.input.virtual.contributor';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { RolesService } from './roles.service';

@InstrumentResolver()
@Resolver()
export class RolesResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private rolesServices: RolesService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => ContributorRoles, {
    nullable: false,
    description: 'The roles that that the specified User has.',
  })
  async rolesUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('rolesData') rolesData: RolesUserInput
  ): Promise<ContributorRoles> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `roles user query: ${agentInfo.email}`
    );
    return this.rolesServices.getRolesForUser(rolesData);
  }

  @Query(() => ContributorRoles, {
    description: 'The roles that the specified Organization has.',
  })
  async rolesOrganization(
    @Args('rolesData') rolesData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    return await this.rolesServices.getRolesForOrganization(rolesData);
  }

  @Query(() => ContributorRoles, {
    description: 'The roles that the specified VirtualContributor has.',
  })
  async rolesVirtualContributor(
    @Args('rolesData') rolesData: RolesVirtualContributorInput
  ): Promise<ContributorRoles> {
    return await this.rolesServices.getRolesForVirtualContributor(rolesData);
  }
}
