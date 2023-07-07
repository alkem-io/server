import { Info, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication';
import { QueryFieldsPipe } from '@common/pipes';
import { MeQueryResults } from './dto/me.query.results';
import { MeService } from './me.service';

@Resolver()
export class MeResolverQueries {
  constructor(private meService: MeService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => MeQueryResults, {
    nullable: false,
    description: 'Information about the current authenticated user',
  })
  @Profiling.api
  async me2(
    @CurrentUser() agentInfo: AgentInfo,
    @Info(QueryFieldsPipe) fields: string[]
  ): Promise<MeQueryResults> {
    return this.meService.buildMeResults(agentInfo.userID);
  }
}
