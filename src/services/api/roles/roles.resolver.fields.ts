import { Parent, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { RolesService } from './roles.service';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { RolesResultSpace } from './dto/roles.dto.result.space';

@Resolver(() => ContributorRoles)
export class RolesResolverFields {
  constructor(
    private rolesService: RolesService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('organizations', () => [RolesResultOrganization], {
    description: 'Details of the roles the contributor has in Organizations',
  })
  public async organizations(
    @Parent() roles: ContributorRoles
  ): Promise<RolesResultOrganization[]> {
    return await this.rolesService.getOrganizationRolesForUser(roles);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('spaces', () => [RolesResultSpace], {
    description:
      'Details of Spaces the User or Organization is a member of, with child memberships - if Space is accessible for the current user.',
  })
  public async spaces(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roles: ContributorRoles
  ): Promise<RolesResultSpace[]> {
    return await this.rolesService.getSpaceRolesForContributor(
      roles,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('invitations', () => [CommunityInvitationForRoleResult], {
    description:
      'The invitations for the specified user; only accessible for platform admins',
  })
  public async invitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roles: ContributorRoles,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityInvitationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `roles user query: ${agentInfo.email}`
    );
    const invitations = await this.rolesService.getCommunityInvitationsForUser(
      roles.id,
      states
    );
    return await this.rolesService.convertInvitationsToRoleResults(invitations);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [CommunityApplicationForRoleResult], {
    description:
      'The applications for the specified user; only accessible for platform admins',
  })
  public async applications(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roles: ContributorRoles,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<CommunityApplicationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `roles user query: ${agentInfo.email}`
    );
    const applications =
      await this.rolesService.getCommunityApplicationsForUser(roles.id, states);
    return await this.rolesService.convertApplicationsToRoleResults(
      applications
    );
  }
}
