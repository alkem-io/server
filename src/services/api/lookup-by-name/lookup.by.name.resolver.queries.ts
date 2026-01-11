import { Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@common/decorators';
import { LookupByNameQueryResults } from '@services/api/lookup-by-name/dto';
import { InstrumentResolver } from '@src/apm/decorators';

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
