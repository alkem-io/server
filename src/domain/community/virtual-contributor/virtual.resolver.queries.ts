import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IVirtual } from './virtual.interface';
import { VirtualService } from './virtual.service';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Resolver()
export class VirtualResolverQueries {
  constructor(private virtualService: VirtualService) {}

  @Query(() => [IVirtual], {
    nullable: false,
    description: 'The Virtuals on this platform',
  })
  @Profiling.api
  async virtuals(
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IVirtual[]> {
    return await this.virtualService.getVirtuals(args);
  }

  @Query(() => IVirtual, {
    nullable: false,
    description: 'A particular Virtual',
  })
  @Profiling.api
  async virtual(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IVirtual> {
    return await this.virtualService.getVirtualOrFail(id);
  }
}
