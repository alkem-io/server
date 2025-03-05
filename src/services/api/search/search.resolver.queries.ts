import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { InstrumentResolver } from '@src/apm/decorators';
import { SearchService } from './search.service';
import { SearchInput } from './dto/inputs';
import { ISearchResults } from './dto/results';

@InstrumentResolver()
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ISearchResults, {
    nullable: false,
    description: 'Search the platform for terms supplied',
  })
  async search(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResults> {
    return this.searchService.search(searchData, agentInfo);
  }
}
