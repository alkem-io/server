import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';

@Resolver()
export class LookupByNameResolverQueries {
  @UseGuards(GraphqlGuard)
  @Query(() => LookupByNameQueryResults, {
    nullable: false,
    description: 'Allow direct lookup of entities using their NameIDs',
  })
  @Profiling.api
  async lookupByName(): Promise<LookupByNameQueryResults> {
    return {} as LookupByNameQueryResults;
  }
}
