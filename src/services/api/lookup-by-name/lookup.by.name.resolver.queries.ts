import { Profiling } from '@common/decorators';
import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';

@InstrumentResolver()
@Resolver()
export class LookupByNameResolverQueries {
  @Query(() => LookupByNameQueryResults, {
    nullable: false,
    description: 'Allow direct lookup of entities using their NameIDs',
  })
  @Profiling.api
  async lookupByName(): Promise<LookupByNameQueryResults> {
    return {} as LookupByNameQueryResults;
  }
}
