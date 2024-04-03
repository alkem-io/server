import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { VirtualContributorInput } from './dto/virtual.contributor.dto.input';
import { VirtualContributorService } from './virtual.contributor.service';
import { IVirtualContributorQueryResult } from './dto/virtual.contributor.query.result.dto';
@Resolver()
export class VirtualContributorResolverQueries {
  constructor(private virtualContributorService: VirtualContributorService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualContributorQueryResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askVirtualContributorQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: VirtualContributorInput
  ): Promise<IVirtualContributorQueryResult> {
    return this.virtualContributorService.askQuestion(chatData, agentInfo);
  }
}
