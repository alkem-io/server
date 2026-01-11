import { Query, Resolver } from '@nestjs/graphql';
import { InputCreatorQueryResults } from '@services/api/input-creator/dto';
import { InstrumentResolver } from '@src/apm/decorators';

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
