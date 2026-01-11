import { Query, Resolver } from '@nestjs/graphql';
import { MeQueryResults } from '@services/api/me/dto';
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
