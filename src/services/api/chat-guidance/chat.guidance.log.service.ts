import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceLog } from './chat.guidance.log.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GuidanceEngineQueryResponse } from '@services/adapters/chat-guidance-adapter/dto/guidance.engine.dto.question.response';
import { UserService } from '@domain/community/user/user.service';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter';

export class ChatGuidanceLogService {
  constructor(
    @InjectRepository(ChatGuidanceLog)
    private chatGuidanceLogRepository: Repository<ChatGuidanceLog>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userService: UserService,
    private guidanceReporter: GuidanceReporterService
  ) {}

  public logAnswer(
    question: string,
    guidanceEngineResponse: GuidanceEngineQueryResponse,
    userId: string
  ): void {
    this.saveToDb(question, guidanceEngineResponse, userId);
    this.reportToElastic(question, guidanceEngineResponse, userId);
  }

  private async reportToElastic(
    question: string,
    guidanceEngineResponse: GuidanceEngineQueryResponse,
    userId: string
  ): Promise<void> {
    const { email } = await this.userService.getUserOrFail(userId);

    this.guidanceReporter.reportUsage({
      usage: {
        answer: guidanceEngineResponse.answer,
        completionTokens: guidanceEngineResponse.completion_tokens,
        promptTokens: guidanceEngineResponse.prompt_tokens,
        question,
        sources: Array.isArray(guidanceEngineResponse.sources) // todo remove when 'sources' is resolved
          ? guidanceEngineResponse.sources
          : [guidanceEngineResponse.sources],
        totalCost: guidanceEngineResponse.total_cost,
        totalTokens: guidanceEngineResponse.total_tokens,
      },
      author: {
        id: userId,
        email,
      },
    });
  }

  private async saveToDb(
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
