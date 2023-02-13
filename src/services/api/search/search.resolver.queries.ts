import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from './dto/search.dto.input';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { ISearchResults } from './dto/search.result.dto';
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
    return await this.searchService.search(searchData, agentInfo);
  }
}
