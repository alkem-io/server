import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IChatGuidanceResult } from './dto/chat.guidance.result.dto';
import { ChatGuidanceAdapter } from '@services/adapters/chat-guidance-adapter/chat.guidance.adapter';

export class ChatGuidanceService {
  constructor(
    private chatGuidanceAdapter: ChatGuidanceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async askQuestion(
    question: string,
    agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult> {
    const response = await this.chatGuidanceAdapter.sendQuery({
      userId: agentInfo.userID,
      question: question,
      triggeredBy: agentInfo.userID,
    });
    const answer = response.result;
    return {
      answer: answer,
    };
  }
}
