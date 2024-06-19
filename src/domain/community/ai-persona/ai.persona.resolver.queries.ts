import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AiPersonaService } from './ai.persona.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAiPersonaQuestionResult } from './dto/ai.persona.question.dto.result';
import { AiPersonaQuestionInput } from './dto/ai.persona.question.dto.input';

@Resolver()
export class AiPersonaResolverQueries {
  constructor(private aiPersonaService: AiPersonaService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IAiPersonaQuestionResult, {
    nullable: false,
    description: 'Ask the virtual persona engine for guidance.',
  })
  async askAiPersonaQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: AiPersonaQuestionInput
  ): Promise<IAiPersonaQuestionResult> {
    return this.aiPersonaService.askQuestion(chatData, agentInfo, '');
  }
}
