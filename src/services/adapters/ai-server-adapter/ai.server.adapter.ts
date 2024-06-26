import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterAskQuestionInput } from './dto/ai.server.adapter.dto.ask.question';
import { IAiPersonaQuestionResult } from './dto/ai.server.adapter.dto.question.result';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { CreateAiPersonaServiceInput } from '@services/ai-server/ai-persona-service/dto';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { SpaceIngestionPurpose } from '@services/infrastructure/event-bus/commands';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServer: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async ensureSpaceIsUsable(
    spaceID: string,
    purpose: SpaceIngestionPurpose
  ): Promise<void> {
    return this.aiServer.ensureSpaceIsUsable(spaceID, purpose);
  }

  async ensurePersonaIsUsable(
    personaServiceId: string,
    purpose: SpaceIngestionPurpose
  ): Promise<void> {
    return this.aiServer.ensurePersonaIsUsable(personaServiceId, purpose);
  }

  async getPersonaServiceOrFail(
    personaServiceId: string
  ): Promise<IAiPersonaService> {
    return this.aiServer.getAiPersonaServiceOrFail(personaServiceId);
  }

  async createAiPersonaService(
    personaServiceData: CreateAiPersonaServiceInput
  ) {
    return this.aiServer.createAiPersonaService(personaServiceData);
  }

  async askQuestion(
    questionInput: AiServerAdapterAskQuestionInput,
    agentInfo: AgentInfo,
    contextSapceNameID: string
  ): Promise<IAiPersonaQuestionResult> {
    return this.aiServer.askQuestion(
      questionInput,
      agentInfo,
      contextSapceNameID
    );
  }
}
