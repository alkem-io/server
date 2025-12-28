import { Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@common/decorators';
import { LookupQueryResults } from '@services/api/lookup/dto';
import { InstrumentResolver } from '@src/apm/decorators';

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
