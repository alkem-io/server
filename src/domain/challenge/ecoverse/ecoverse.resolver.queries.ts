import { Inject } from '@nestjs/common';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse } from './ecoverse.interface';
import { Ecoverse } from './ecoverse.entity';
import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Query(() => Ecoverse, {
    nullable: false,
    description: 'The ecoverse.',
  })
  @Profiling.api
  async ecoverse(): Promise<IEcoverse> {
    return await this.ecoverseService.getDefaultEcoverseOrFail();
  }
}
