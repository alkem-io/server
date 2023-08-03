import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IChatGuidanceQueryResult } from './dto/chat.guidance.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';
import { GuidanceEngineAdapter } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter';

export class ChatGuidanceService {
  constructor(
    private guidanceEngineAdapter: GuidanceEngineAdapter,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    question: string,
    agentInfo: AgentInfo
  ): Promise<IChatGuidanceQueryResult> {
    return this.guidanceEngineAdapter.sendQuery({
      userId: agentInfo.userID,
      question: question,
    });
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    return this.guidanceEngineAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(): Promise<boolean> {
    return this.guidanceEngineAdapter.sendIngest();
  }

  public isGuidanceEngineEnabled(): boolean {
    const result = this.configService.get(ConfigurationTypes.PLATFORM)
      .guidance_engine?.enabled;
    if (result) {
      return true;
    }
    return false;
  }
}
