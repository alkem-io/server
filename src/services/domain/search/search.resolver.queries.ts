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
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
@Resolver()
export class SearchResolverQueries {
  private searchAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private searchService: SearchService
  ) {
    this.searchAuthorizationPolicy =
      this.authorizationEngine.createGlobalRolesAuthorizationPolicy(
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
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      this.searchAuthorizationPolicy,
      `search query: ${agentInfo.email}`
    );
    return await this.searchService.search(searchData, agentInfo);
  }
}
