import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from './dto/search.dto.input';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { ISearchResult } from './dto/search.result.entry.interface';
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [ISearchResult], {
    nullable: false,
    description: 'Search the hub for terms supplied',
  })
  @Profiling.api
  async search(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResult[]> {
    return await this.searchService.search(searchData, agentInfo);
  }
}
