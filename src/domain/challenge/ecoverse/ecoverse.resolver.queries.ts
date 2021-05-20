import { Inject } from '@nestjs/common';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from './ecoverse.interface';
import { Args, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Query(() => IEcoverse, {
    nullable: false,
    description:
      'An ecoverse. If no ID is specified then the first Ecoverse is returned.',
  })
  @Profiling.api
  async ecoverse(
    @Args('ID', { nullable: true }) ID?: string
  ): Promise<IEcoverse> {
    if (ID) return await this.ecoverseService.getEcoverseByIdOrFail(ID);
    return await this.ecoverseService.getDefaultEcoverseOrFail();
  }
}
