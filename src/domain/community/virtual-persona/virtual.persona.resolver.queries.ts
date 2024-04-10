import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IVirtualPersona } from './virtual.persona.interface';
import { VirtualPersonaService } from './virtual.persona.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { IVirtualPersonaQuestionResult } from './dto/virtual.persona.question.dto.result';
import { VirtualPersonaQuestionInput } from './dto/virtual.persona.question.dto.input';

@Resolver()
export class VirtualPersonaResolverQueries {
  constructor(private virtualPersonaService: VirtualPersonaService) {}

  @Query(() => [IVirtualPersona], {
    nullable: false,
    description: 'The VirtualPersonas on this platform',
  })
  @Profiling.api
  async virtualPersonas(): Promise<IVirtualPersona[]> {
    return await this.virtualPersonaService.getVirtualPersonas();
  }

  @Query(() => IVirtualPersona, {
    nullable: false,
    description: 'A particular VirtualPersona',
  })
  @Profiling.api
  async virtualPersona(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IVirtualPersona> {
    return await this.virtualPersonaService.getVirtualPersonaOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualPersonaQuestionResult, {
    nullable: false,
    description: 'Ask the virtual persona engine for guidance.',
  })
  async askVirtualPersonaQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: VirtualPersonaQuestionInput
  ): Promise<IVirtualPersonaQuestionResult> {
    return this.virtualPersonaService.askQuestion(chatData, agentInfo);
  }
}
