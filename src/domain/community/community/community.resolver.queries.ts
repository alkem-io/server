import { Args, Query, Resolver } from '@nestjs/graphql';
import { CommunityService } from './community.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICommunity } from './community.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class CommunityResolverQueries {
  constructor(
    private communityService: CommunityService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ICommunity, {
    nullable: false,
    description: 'A specific Community entity.',
  })
  async community(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) ID: string
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.READ,
      `querying Community entity directly: ${community.id}`
    );
    return community;
  }
}
