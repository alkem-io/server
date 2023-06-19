import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  InnovationHxb as InnovationHxbDecorator,
  Profiling,
} from '@src/common/decorators';
import { UUID_NAMEID } from '@domain/common/scalars';
import { HubService } from './hub.service';
import { IHub } from './hub.interface';
import { HubsQueryArgs } from './dto/hub.args.query.hubs';
import { InnovationHxb } from '@domain/innovation-hub/types';

@Resolver()
export class HubResolverQueries {
  constructor(@Inject(HubService) private hubService: HubService) {}

  @Query(() => [IHub], {
    nullable: false,
    description: 'The Hubs on this platform',
  })
  @Profiling.api
  async hubs(
    @InnovationHxbDecorator() innovationHxb: InnovationHxb | undefined,
    @Args({ nullable: true }) args: HubsQueryArgs
  ): Promise<IHub[]> {
    if (!innovationHxb) {
      return await this.hubService.getHubs(args);
    }

    return this.hubService.getSpacesForInnovationHxb(innovationHxb);
  }

  @Query(() => IHub, {
    nullable: false,
    description:
      'An hub. If no ID is specified then the first Hub is returned.',
  })
  @Profiling.api
  async hub(
    @Args('ID', { type: () => UUID_NAMEID }) ID: string
  ): Promise<IHub> {
    return await this.hubService.getHubOrFail(ID);
  }
}
