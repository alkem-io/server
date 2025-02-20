import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Profiling } from '@common/decorators';
import { InputCreatorQueryResults } from './dto/input.creator.query.results';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InputCreatorResolverQueries {
  @UseGuards(GraphqlGuard)
  @Query(() => InputCreatorQueryResults, {
    nullable: false,
    description:
      'Allow creation of inputs based on existing entities in the domain model',
  })
  @Profiling.api
  async inputCreator(): Promise<InputCreatorQueryResults> {
    return {} as InputCreatorQueryResults;
  }
}
