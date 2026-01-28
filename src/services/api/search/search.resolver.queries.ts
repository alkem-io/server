import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { SearchInput } from './dto/inputs';
import { ISearchResults } from './dto/results';
import { SearchService } from './search.service';

@InstrumentResolver()
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

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
