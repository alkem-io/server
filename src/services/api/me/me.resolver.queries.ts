import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { MeQueryResults } from './dto/me.query.results';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class MeResolverQueries {
  @UseGuards(GraphqlGuard)
  @Query(() => MeQueryResults, {
    nullable: false,
    description: 'Information about the current authenticated user',
  })
  @Profiling.api
  async me(): Promise<MeQueryResults> {
    return {} as MeQueryResults;
  }
}
