import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { IVirtualContributorQueryResult } from './dto/virtual.contributor.query.result.dto';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { ConfigService } from '@nestjs/config';
import { VirtualContributorInput } from './dto/virtual.contributor.dto.input';
import { VirtualContributorAdapter } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.adapter';

export class VirtualContributorService {
  constructor(
    private virtualContributorAdapter: VirtualContributorAdapter,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async askQuestion(
    chatData: VirtualContributorInput,
    agentInfo: AgentInfo
  ): Promise<IVirtualContributorQueryResult> {
    const response = await this.virtualContributorAdapter.sendQuery({
      userId: agentInfo.userID,
      question: chatData.question,
      prompt: chatData.prompt,
    });

    return response;
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualContributorAdapter.sendReset({
      userId: agentInfo.userID,
    });
  }

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualContributorAdapter.sendIngest({
      userId: agentInfo.userID,
    });
  }

  public isGuidanceEngineEnabled(): boolean {
    const result = this.configService.get(ConfigurationTypes.PLATFORM)
      .guidance_engine?.enabled;

    return Boolean(result);
  }
}
