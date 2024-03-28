import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { SearchInput } from './dto/search.dto.input';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { ISearchResults } from './dto/search.result.dto';
import { SearchService } from './search.service';
import { Search2Service } from '../search2/search2.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
@Resolver()
export class SearchResolverQueries {
  private readonly useNewSearch: boolean;
  constructor(
    private configService: ConfigService,
    private searchService: SearchService,
    private search2Service: Search2Service
  ) {
    this.useNewSearch = this.configService.get(
      ConfigurationTypes.SEARCH
    )?.use_new;
  }

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
    return this.useNewSearch
      ? this.search2Service.search(searchData, agentInfo)
      : this.searchService.search(searchData, agentInfo);
  }
}
