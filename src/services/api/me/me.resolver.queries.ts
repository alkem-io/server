import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { MeQueryResults } from './dto/me.query.results';

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
