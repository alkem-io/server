import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { LogContext } from '@common/enums/logging.context';
import { ChatGuidanceAdapter } from '@services/adapters/chat-guidance-adapter/chat,guidance.adapter';
import { IChatGuidanceResult } from './dto/chat.guidance.result.dto';

export class ChatGuidanceService {
  constructor(
    private chatGuidanceAdapter: ChatGuidanceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async askQuestion(
    question: string,
    agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult> {
    this.logger.verbose?.(
      `Establishing session with question hook: ${question} for user ${agentInfo.email}`,
      LogContext.SSI_SOVRHD
    );
    const response = await this.chatGuidanceAdapter.askQuestion({
      question: question,
      triggeredBy: agentInfo.userID,
    });
    const answer = response.result;
    return {
      answer: answer,
    };
  }
}
