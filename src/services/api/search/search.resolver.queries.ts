import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { InstrumentResolver } from '@src/apm/decorators';
import { SearchService } from './search.service';
import { SearchInput } from './dto/inputs';
import { ISearchResults } from './dto/results';

@InstrumentResolver()
@Resolver()
export class SearchResolverQueries {
  constructor(private searchService: SearchService) {}

  @Query(() => ISearchResults, {
    nullable: false,
    description: 'Search the platform for terms supplied',
  })
  async search(
    @CurrentActor() actorContext: ActorContext,
    @Args('searchData') searchData: SearchInput
  ): Promise<ISearchResults> {
    return this.searchService.search(searchData, actorContext);
  }
}
