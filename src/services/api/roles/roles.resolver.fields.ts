import { Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { Args, ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication/agent-info';
import { InvitationForRoleResult } from './dto/roles.dto.result.invitation';
import { RolesService } from './roles.service';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { ApplicationForRoleResult } from './dto/roles.dto.result.application';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums';

@Resolver(() => ContributorRoles)
export class RolesResolverFields {
  constructor(
    private rolesService: RolesService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [InvitationForRoleResult], {
    description: 'The invitations of the current authenticated user',
  })
  public async invitations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<InvitationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS, //TODO: convert to PLATFORM_ADMIN
      `roles user query: ${agentInfo.email}`
    );
    return await this.rolesService.getUserInvitations(agentInfo.userID, states);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => [ApplicationForRoleResult], {
    description: 'The applications for the specified user',
  })
  public async applications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'states',
      nullable: true,
      type: () => [String],
      description: 'The state names you want to filter on',
    })
    states: string[]
  ): Promise<ApplicationForRoleResult[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS, //TODO: convert to PLATFORM_ADMIN
      `roles user query: ${agentInfo.email}`
    );
    return await this.rolesService.getUserApplications(
      agentInfo.userID,
      states
    );
  }
}
