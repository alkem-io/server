import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceQuestionResponse } from './dto/chat.guidance.adapter.dto.question.response';
import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class ChatGuidanceAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async askQuestion(
    question: string,
    agentInfo: AgentInfo
  ): Promise<ChatGuidanceQuestionResponse> {
    this.logger.verbose?.(
      `Establishing session with question hook: ${question} for user ${agentInfo.email}`,
      LogContext.SSI_SOVRHD
    );
    const response = `${question}`;
    return {
      result: response,
    };
  }
}
