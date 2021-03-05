import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { Roles } from '@utils/authorization/roles.decorator';
import { GqlAuthGuard } from '@utils/authorization/graphql.guard';
import { SearchService } from './search.service';
import { ISearchResultEntry } from './search-result-entry.interface';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { SearchInput } from './search-input.dto';
import { SearchResultEntry } from './search-result-entry.dto';
import { AuthorizationRoles } from '@utils/authorization/authorization.roles';

@Resolver()
export class SearchResolver {
  constructor(private searchService: SearchService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
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
