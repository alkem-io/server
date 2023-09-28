import { Inject, UseGuards } from '@nestjs/common';
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
import { GraphqlGuard } from '@core/authorization';
import { PaginatedSpaces, PaginationArgs } from '@core/pagination';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

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

  @UseGuards(GraphqlGuard)
  @Query(() => PaginatedSpaces, {
    nullable: false,
    description: 'The Spaces on this platform',
  })
  @Profiling.api
  async spacesPaginated(
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: SpaceFilterInput
  ): Promise<PaginatedSpaces> {
    return this.spaceService.getPaginatedSpaces(pagination, filter);
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
