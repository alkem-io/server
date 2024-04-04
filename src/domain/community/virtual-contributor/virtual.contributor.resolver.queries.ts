import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Resolver()
export class VirtualContributorResolverQueries {
  constructor(private virtualService: VirtualContributorService) {}

  @Query(() => [IVirtualContributor], {
    nullable: false,
    description: 'The Virtuals on this platform',
  })
  @Profiling.api
  async virtuals(
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    return await this.virtualService.getVirtualContributors(args);
  }

  @Query(() => IVirtualContributor, {
    nullable: false,
    description: 'A particular Virtual',
  })
  @Profiling.api
  async virtual(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    return await this.virtualService.getVirtualContributorOrFail(id);
  }
}
