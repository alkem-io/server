import { Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@common/decorators';
import { InputCreatorQueryResults } from './dto/input.creator.query.results';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InputCreatorResolverQueries {
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
