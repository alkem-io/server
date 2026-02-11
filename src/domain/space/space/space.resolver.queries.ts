import { RestrictedSpaceNames } from '@common/enums/restricted.space.names';
import { PaginatedSpaces, PaginationArgs } from '@core/pagination';
import { InnovationHub } from '@domain/innovation-hub/types';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { InstrumentResolver } from '@src/apm/decorators';
import { InnovationHub as InnovationHubDecorator } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ExploreSpacesInput } from './dto/explore.spaces.dto.input';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { ISpace } from './space.interface';
import { SpaceService } from './space.service';

@InstrumentResolver()
@Resolver()
export class SpaceResolverQueries {
  constructor(
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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

  @Query(() => [ISpace], {
    nullable: false,
    description: 'Active Spaces only, order by most active in the past X days.',
  })
  public exploreSpaces(
    @Args('options', { nullable: true }) options?: ExploreSpacesInput
  ): Promise<ISpace[]> {
    return this.spaceService.getExploreSpaces(options?.limit, options?.daysOld);
  }

  @Query(() => [String], {
    nullable: false,
    description: 'Get the list of restricted space names.',
  })
  restrictedSpaceNames(): string[] {
    return RestrictedSpaceNames;
  }
}
