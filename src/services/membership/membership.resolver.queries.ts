import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { MembershipService } from './membership.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Membership, MembershipInput } from './index';
import { AuthorizationRoleGlobal } from '@common/enums';

@Resolver()
export class MembershipResolverQueries {
  constructor(private membershipService: MembershipService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => Membership, {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async membership(
    @Args('membershipData') membershipData: MembershipInput
  ): Promise<Membership> {
    return await this.membershipService.membership(membershipData);
  }
}
