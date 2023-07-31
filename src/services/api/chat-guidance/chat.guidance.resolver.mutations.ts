import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceService } from './chat.guidance.service';
import { IChatGuidanceResult } from './dto/chat.guidance.result.dto';

@Resolver()
export class ChatGuidanceResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private chatGuidanceService: ChatGuidanceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChatGuidanceResult, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult | undefined> {
    return this.chatGuidanceService.resetUserHistory(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChatGuidanceResult, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async ingest(): Promise<IChatGuidanceResult | undefined> {
    return this.chatGuidanceService.ingest();
  }
}
