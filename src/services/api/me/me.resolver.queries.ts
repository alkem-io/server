import { Query, Resolver } from '@nestjs/graphql';
import { MeQueryResults } from './dto/me.query.results';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class MeResolverQueries {
  @Query(() => MeQueryResults, {
    nullable: false,
    description: 'Information about the current authenticated user',
  })
  async me(): Promise<MeQueryResults> {
    return {} as MeQueryResults;
  }
}
