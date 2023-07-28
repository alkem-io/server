import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { LookupQueryResults } from './dto/lookup.query.results';

@Resolver()
export class LookupResolverQueries {
  @UseGuards(GraphqlGuard)
  @Query(() => LookupQueryResults, {
    nullable: false,
    description: 'Allow direct lookup of entities from the domain model',
  })
  @Profiling.api
  async lookup(): Promise<LookupQueryResults> {
    return {} as LookupQueryResults;
  }
}
