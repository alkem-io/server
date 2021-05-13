import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { ISearchResultEntry } from './search-result-entry.interface';
import { Profiling } from '@src/common/decorators';
import { SearchInput } from './search-input.dto';
import { SearchResultEntry } from './search-result-entry.dto';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';
@Resolver()
export class SearchResolver {
  constructor(private searchService: SearchService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => [SearchResultEntry], {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async search(
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResultEntry[]> {
    return await this.searchService.search(searchData);
  }
}
