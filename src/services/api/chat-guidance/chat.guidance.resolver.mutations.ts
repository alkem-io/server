import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Resolver()
export class ChatGuidanceResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Reset the chat guidance engine: ${agentInfo.userID}`,
      LogContext.CHAT_GUIDANCE
    );

    return true;
  }
}
