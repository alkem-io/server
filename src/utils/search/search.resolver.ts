import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { Roles } from '../decorators/roles.decorator';
import { GqlAuthGuard } from '../authentication/graphql.guard';
import { SearchService } from './search.service';
import { ISearchResult } from './search-result.interface';
import { Profiling } from '../logging/logging.profiling.decorator';
import { SearchInput } from './search-input.dto';
import { SearchResult } from './search-result.dto';
import { RestrictedGroupNames } from '../../domain/user-group/user-group.entity';

@Resolver()
export class SearchResolver {
  constructor(private searchService: SearchService) {}

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [SearchResult], {
    nullable: false,
    description: 'Search the ecoverse for terms supplied',
  })
  @Profiling.api
  async search(
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResult[]> {
    return await this.searchService.search(searchData);
  }
}
