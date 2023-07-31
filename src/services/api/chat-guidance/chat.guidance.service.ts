import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IChatGuidanceResult } from './dto/chat.guidance.result.dto';
import { ChatGuidanceAdapter } from '@services/adapters/chat-guidance-adapter/chat.guidance.adapter';
import { IChatGuidanceQueryResult } from './dto/chat.guidance.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';

export class ChatGuidanceService {
  constructor(
    private chatGuidanceAdapter: ChatGuidanceAdapter,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    question: string,
    agentInfo: AgentInfo
  ): Promise<IChatGuidanceQueryResult | undefined> {
    return this.chatGuidanceAdapter.sendQuery({
      userId: agentInfo.userID,
      question: question,
    });
  }

  public async resetUserHistory(
    agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult | undefined> {
    return this.chatGuidanceAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(): Promise<IChatGuidanceResult | undefined> {
    return this.chatGuidanceAdapter.sendIngest();
  }

  public isGuidanceEngineEnabled(): boolean {
    // todo: safe?
    const result = this.configService.get(ConfigurationTypes.SSI).enabled;
    if (result) {
      return true;
    }
    return false;
  }
}
