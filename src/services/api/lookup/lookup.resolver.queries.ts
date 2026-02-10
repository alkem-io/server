import { Profiling } from '@common/decorators';
import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { LookupQueryResults } from './dto/lookup.query.results';

@InstrumentResolver()
@Resolver()
export class LookupResolverQueries {
  @Query(() => LookupQueryResults, {
    nullable: false,
    description: 'Allow direct lookup of entities from the domain model',
  })
  @Profiling.api
  async lookup(): Promise<LookupQueryResults> {
    return {} as LookupQueryResults;
  }
}
