import { Query, Resolver } from '@nestjs/graphql';
import { IInnovationSpace } from '@domain/innovation-space/innovation.space.interface';

@Resolver(() => IInnovationSpace)
export class InnovationSpaceResolverQueries {
  @Query(() => [IInnovationSpace], {
    description: 'List of innovation spaces on the platform',
  })
  public async innovationSpaces(): Promise<IInnovationSpace[]> {
    return [];
  }
}
