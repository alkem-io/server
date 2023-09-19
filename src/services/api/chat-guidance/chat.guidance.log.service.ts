import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceLog } from './chat.guidance.log.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GuidanceEngineQueryResponse } from '@services/adapters/chat-guidance-adapter/dto/guidance.engine.dto.question.response';

export class ChatGuidanceLogService {
  constructor(
    @InjectRepository(ChatGuidanceLog)
    private chatGuidanceLogRepository: Repository<ChatGuidanceLog>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async logAnswer(
    question: string,
    guidanceEngineResponse: GuidanceEngineQueryResponse,
    userId: string
  ): Promise<void> {
    const chatGuidanceLog: ChatGuidanceLog = ChatGuidanceLog.create({
      question,
      createdBy: userId,
      promptTokens: guidanceEngineResponse.prompt_tokens,
      completionTokens: guidanceEngineResponse.completion_tokens,
      totalTokens: guidanceEngineResponse.total_tokens,
      totalCost: guidanceEngineResponse.total_cost,
      ...guidanceEngineResponse,
    });
    await this.chatGuidanceLogRepository.save(chatGuidanceLog);
  }
}
