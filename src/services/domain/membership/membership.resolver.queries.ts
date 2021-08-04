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
import { OrganisationMembership } from './membership.dto.organisation.result';
import { MembershipOrganisationInput } from './membership.dto.organisation.input';

@Resolver()
export class MembershipResolverQueries {
  private membershipAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private membershipService: MembershipService
  ) {
    this.membershipAuthorizationPolicy =
      this.authorizationEngine.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.Registered],
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
  @Query(() => OrganisationMembership, {
    description: 'The memberships for this Organisation',
  })
  @Profiling.api
  async membershipOrganisation(
    @Args('membershipData') membershipData: MembershipOrganisationInput
  ): Promise<OrganisationMembership> {
    return await this.membershipService.getOrganisationMemberships(
      membershipData
    );
  }
}
