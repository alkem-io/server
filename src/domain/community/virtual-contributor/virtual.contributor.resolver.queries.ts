import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Resolver()
export class VirtualContributorResolverQueries {
  constructor(private virtualContributorService: VirtualContributorService) {}

  @Query(() => [IVirtualContributor], {
    nullable: false,
    description: 'The VirtualContributors on this platform',
  })
  @Profiling.api
  async virtualContributors(
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    return await this.virtualContributorService.getVirtualContributors(args);
  }

  @Query(() => IVirtualContributor, {
    nullable: false,
    description: 'A particular VirtualContributor',
  })
  @Profiling.api
  async virtualContributor(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    return await this.virtualContributorService.getVirtualContributorOrFail(id);
  }
}
