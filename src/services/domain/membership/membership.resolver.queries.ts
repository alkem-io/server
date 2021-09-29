import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { MembershipService } from './membership.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { MembershipUserInput, UserMembership } from './index';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AgentInfo } from '@core/authentication';
import { OrganizationMembership } from './membership.dto.organization.result';
import { MembershipOrganizationInput } from './membership.dto.organization.input';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class MembershipResolverQueries {
  private membershipAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private membershipService: MembershipService
  ) {
    this.membershipAuthorizationPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.REGISTERED],
        [AuthorizationPrivilege.READ]
      );
  }

  @UseGuards(GraphqlGuard)
  @Query(() => UserMembership, {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async membershipUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: MembershipUserInput
  ): Promise<UserMembership> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.membershipAuthorizationPolicy,
      `membership query: ${agentInfo.email}`
    );
    return await this.membershipService.getUserMemberships(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => OrganizationMembership, {
    description: 'The memberships for this Organization',
  })
  @Profiling.api
  async membershipOrganization(
    @Args('membershipData') membershipData: MembershipOrganizationInput
  ): Promise<OrganizationMembership> {
    return await this.membershipService.getOrganizationMemberships(
      membershipData
    );
  }
}
