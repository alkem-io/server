import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { Roles } from '@utils/decorators/roles.decorator';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { SearchService } from './search.service';
import { ISearchResultEntry } from './search-result-entry.interface';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { SearchInput } from './search-input.dto';
import { SearchResultEntry } from './search-result-entry.dto';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';

@Resolver()
export class SearchResolver {
  constructor(private searchService: SearchService) {}

  @Roles(RestrictedGroupNames.Members)
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
