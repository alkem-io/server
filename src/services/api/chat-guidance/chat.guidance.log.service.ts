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

  public async logAnswer(
    question: string,
    guidanceEngineResponse: GuidanceEngineQueryResponse,
    userId: string
  ): Promise<string> {
    const answerId = await this.saveToDb(
      question,
      guidanceEngineResponse,
      userId
    );
    this.reportToElastic(question, guidanceEngineResponse, answerId, userId);

    return answerId;
  }

  private async reportToElastic(
    question: string,
    guidanceEngineResponse: GuidanceEngineQueryResponse,
    answerId: string,
    userId: string
  ): Promise<void> {
    const { email } = await this.userService.getUserOrFail(userId);

    this.guidanceReporter.reportUsage({
      usage: {
        answerId,
        answer: guidanceEngineResponse.answer,
        completionTokens: guidanceEngineResponse.completion_tokens,
        promptTokens: guidanceEngineResponse.prompt_tokens,
        question,
        sources: guidanceEngineResponse.sources,
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
  ): Promise<string> {
    const { id } = await this.chatGuidanceLogRepository.save({
      question,
      createdBy: userId,
      promptTokens: guidanceEngineResponse.prompt_tokens,
      completionTokens: guidanceEngineResponse.completion_tokens,
      totalTokens: guidanceEngineResponse.total_tokens,
      totalCost: guidanceEngineResponse.total_cost,
    });

    return id;
  }
}
