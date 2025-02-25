import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InnovationHub as InnovationHubDecorator } from '@src/common/decorators';
import { SpaceService } from './space.service';
import { ISpace } from './space.interface';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { ExploreSpacesInput } from './dto/explore.spaces.dto.input';
import { InnovationHub } from '@domain/innovation-hub/types';
import { GraphqlGuard } from '@core/authorization';
import { PaginatedSpaces, PaginationArgs } from '@core/pagination';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class SpaceResolverQueries {
  constructor(
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [ISpace], {
    nullable: false,
    description:
      'The Spaces on this platform; If accessed through an Innovation Hub will return ONLY the Spaces defined in it.',
  })
  spaces(
    @InnovationHubDecorator() innovationHub: InnovationHub | undefined,
    @Args({ nullable: true }) args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    if (!innovationHub) {
      return this.spaceService.getSpacesSorted(args);
    }

    return this.spaceService.getSpacesForInnovationHub(innovationHub);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => PaginatedSpaces, {
    nullable: false,
    description: 'The Spaces on this platform',
  })
  async spacesPaginated(
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: SpaceFilterInput
  ): Promise<PaginatedSpaces> {
    return this.spaceService.getPaginatedSpaces(pagination, filter);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [ISpace], {
    nullable: false,
    description: 'Active Spaces only, order by most active in the past X days.',
  })
  public exploreSpaces(
    @Args('options', { nullable: true }) options?: ExploreSpacesInput
  ): Promise<ISpace[]> {
    return this.spaceService.getExploreSpaces(options?.limit, options?.daysOld);
  }
}
