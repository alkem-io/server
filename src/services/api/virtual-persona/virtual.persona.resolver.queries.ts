import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { VirtualPersonaInput } from './dto/virtual.persona.dto.input';
import { VirtualPersonaService } from './virtual.persona.service';
import { IVirtualPersonaQueryResult } from './dto/virtual.persona.query.result.dto';
@Resolver()
export class VirtualPersonaResolverQueries {
  constructor(private virtualContributorService: VirtualPersonaService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualPersonaQueryResult, {
    nullable: false,
    description: 'Ask the virtual persona engine for guidance.',
  })
  async askVirtualContributorQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: VirtualPersonaInput
  ): Promise<IVirtualPersonaQueryResult> {
    return this.virtualContributorService.askQuestion(chatData, agentInfo);
  }
}
