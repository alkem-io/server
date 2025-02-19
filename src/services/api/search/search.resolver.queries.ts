import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from '@services/api/search/dto/search.dto.input';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ISearchResults } from '@services/api/search/dto/search.result.dto';
import { SearchService } from './search.service';
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ISearchResults, {
    nullable: false,
    description: 'Search the platform for terms supplied',
  })
  @Profiling.api
  async search(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResults> {
    return this.searchService.search(searchData, agentInfo);
  }
}
