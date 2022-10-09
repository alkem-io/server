import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { ISearchResultEntry } from './search-result-entry.interface';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from './search-input.dto';
import { SearchResultEntry } from './search-result-entry.dto';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [SearchResultEntry], {
    nullable: false,
    description: 'Search the hub for terms supplied',
  })
  @Profiling.api
  async search(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResultEntry[]> {
    return await this.searchService.search(searchData, agentInfo);
  }
}
