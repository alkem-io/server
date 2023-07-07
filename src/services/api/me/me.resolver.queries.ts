import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { MeQueryResults } from './dto/me.query.results';

@Resolver()
export class MeResolverQueries {
  @UseGuards(GraphqlGuard)
  @Query(() => MeQueryResults, {
    nullable: false,
    description: 'Information about the current authenticated user',
  })
  @Profiling.api
  async me2(): Promise<MeQueryResults> {
    return {} as MeQueryResults;
  }
}
