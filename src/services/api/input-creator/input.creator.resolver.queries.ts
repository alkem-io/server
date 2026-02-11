import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { InputCreatorQueryResults } from './dto/input.creator.query.results';

@InstrumentResolver()
@Resolver()
export class InputCreatorResolverQueries {
  @Query(() => InputCreatorQueryResults, {
    nullable: false,
    description:
      'Allow creation of inputs based on existing entities in the domain model',
  })
  async inputCreator(): Promise<InputCreatorQueryResults> {
    return {} as InputCreatorQueryResults;
  }
}
