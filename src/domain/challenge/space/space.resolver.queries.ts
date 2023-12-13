import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  CurrentUser,
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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

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
  @Profiling.api
  spaces(
    @InnovationHubDecorator() innovationHub: InnovationHub | undefined,
    @Args({ nullable: true }) args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    if (!innovationHub) {
      return this.spaceService.getSpaces(args);
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
    @Args('ID', { type: () => UUID_NAMEID }) ID: string,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(ID);
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space with ID: '${ID}'`,
        LogContext.CHALLENGES,
        { userId: agentInfo.userID }
      );
    }
    return space;
  }
}
