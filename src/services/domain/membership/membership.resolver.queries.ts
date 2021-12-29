import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { MembershipService } from './membership.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { MembershipUserInput, UserMembership } from './index';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { OrganizationMembership } from './membership.dto.organization.result';
import { MembershipOrganizationInput } from './membership.dto.organization.input';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class MembershipResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private membershipService: MembershipService
  ) {}

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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
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
