import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IVirtualContributorQueryResult } from './dto/virtual.contributor.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';
import { GuidanceEngineAdapter } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter';
import { VirtualContributorInput } from './dto/virtual.contributor.dto.input';

export class VirtualContributorService {
  constructor(
    private guidanceEngineAdapter: GuidanceEngineAdapter,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    chatData: VirtualContributorInput,
    agentInfo: AgentInfo
  ): Promise<IVirtualContributorQueryResult> {
    const response = await this.guidanceEngineAdapter.sendQuery({
      userId: agentInfo.userID,
      question: chatData.question,
      language: chatData.language ?? 'EN',
    });

    return response;
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    return this.guidanceEngineAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.guidanceEngineAdapter.sendIngest({
      userId: agentInfo.userID,
    });
  }

  public isGuidanceEngineEnabled(): boolean {
    const result = this.configService.get(ConfigurationTypes.PLATFORM)
      .guidance_engine?.enabled;

    return Boolean(result);
  }
}
