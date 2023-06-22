import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  InnovationHub as InnovationHubDecorator,
  Profiling,
} from '@src/common/decorators';
import { UUID_NAMEID } from '@domain/common/scalars';
import { SpaceService } from './space.service';
import { ISpace } from './space.interface';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { InnovationHub } from '@domain/innovation-hub/types';

@Resolver()
export class SpaceResolverQueries {
  constructor(@Inject(SpaceService) private spaceService: SpaceService) {}

  @Query(() => [ISpace], {
    nullable: false,
    description: 'The Spaces on this platform',
  })
  @Profiling.api
  async spaces(
    @InnovationHubDecorator() innovationHub: InnovationHub | undefined,
    @Args({ nullable: true }) args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    if (!innovationHub) {
      return await this.spaceService.getSpaces(args);
    }

    return this.spaceService.getSpacesForInnovationHub(innovationHub);
  }

  @Query(() => ISpace, {
    nullable: false,
    description:
      'An space. If no ID is specified then the first Space is returned.',
  })
  @Profiling.api
  async space(
    @Args('ID', { type: () => UUID_NAMEID }) ID: string
  ): Promise<ISpace> {
    return await this.spaceService.getSpaceOrFail(ID);
  }
}
