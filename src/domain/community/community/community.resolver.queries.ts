import { Inject } from '@nestjs/common';
import { Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { CommunityService } from './community.service';
import { ICommunity } from './community.interface';

@Resolver()
export class CommunityResolverQueries {
  constructor(
    @Inject(CommunityService) private communityService: CommunityService
  ) {}

  @Query(() => ICommunity, {
    nullable: false,
    description: 'A community. A valid community ID needs to be specified.',
  })
  @Profiling.api
  async community(
    @Args('ID', { type: () => UUID }) ID: string
  ): Promise<ICommunity> {
    return await this.communityService.getCommunityOrFail(ID);
  }
}
