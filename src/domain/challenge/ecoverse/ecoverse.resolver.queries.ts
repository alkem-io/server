import { Inject } from '@nestjs/common';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from './ecoverse.interface';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Query(() => [IEcoverse], {
    nullable: false,
    description: 'The Ecoverses on this platform',
  })
  @Profiling.api
  async ecoverses(): Promise<IEcoverse[]> {
    return await this.ecoverseService.getEcoverses();
  }

  @Query(() => IEcoverse, {
    nullable: false,
    description:
      'An ecoverse. If no ID is specified then the first Ecoverse is returned.',
  })
  @Profiling.api
  async ecoverse(
    @Args('ID', { type: () => UUID_NAMEID }) ID: string
  ): Promise<IEcoverse> {
    return await this.ecoverseService.getEcoverseOrFail(ID);
  }
}
