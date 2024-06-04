import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { VirtualPersonaService } from './virtual.persona.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IVirtualPersonaQuestionResult } from './dto/virtual.persona.question.dto.result';
import { VirtualPersonaQuestionInput } from './dto/virtual.persona.question.dto.input';

@Resolver()
export class VirtualPersonaResolverQueries {
  constructor(private virtualPersonaService: VirtualPersonaService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualPersonaQuestionResult, {
    nullable: false,
    description: 'Ask the virtual persona engine for guidance.',
  })
  async askVirtualPersonaQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: VirtualPersonaQuestionInput
  ): Promise<IVirtualPersonaQuestionResult> {
    return this.virtualPersonaService.askQuestion(chatData, agentInfo, '', '');
  }
}
