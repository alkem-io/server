import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { MembershipService } from './membership.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Membership, MembershipInput } from './index';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { AgentInfo } from '@core/authentication';

@Resolver()
export class MembershipResolverQueries {
  private membershipAuthorizationDefinition: IAuthorizationDefinition;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private membershipService: MembershipService
  ) {
    this.membershipAuthorizationDefinition = this.authorizationEngine.createGlobalRolesAuthorizationDefinition(
      [AuthorizationRoleGlobal.Registered],
      [AuthorizationPrivilege.READ]
    );
  }

  @UseGuards(GraphqlGuard)
  @Query(() => Membership, {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async membership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: MembershipInput
  ): Promise<Membership> {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.membershipAuthorizationDefinition,
      `membership query: ${agentInfo.email}`
    );
    return await this.membershipService.membership(membershipData);
  }
}
