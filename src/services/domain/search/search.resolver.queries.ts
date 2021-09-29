import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { ISearchResultEntry } from './search-result-entry.interface';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from './search-input.dto';
import { SearchResultEntry } from './search-result-entry.dto';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
@Resolver()
export class SearchResolverQueries {
  private searchAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private searchService: SearchService
  ) {
    this.searchAuthorizationPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.REGISTERED],
        [AuthorizationPrivilege.READ]
      );
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [SearchResultEntry], {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async search(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResultEntry[]> {
    await this.authorizationService.grantReadAccessOrFail(
      agentInfo,
      this.searchAuthorizationPolicy,
      `search query: ${agentInfo.email}`
    );
    return await this.searchService.search(searchData, agentInfo);
  }
}
