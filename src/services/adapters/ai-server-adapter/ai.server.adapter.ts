import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterAskQuestionInput } from './dto/ai.server.adapter.dto.ask.question';
import { IAiPersonaQuestionResult } from './dto/ai.server.adapter.dto.question.result';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { CreateAiPersonaServiceInput } from '@services/ai-server/ai-persona-service/dto';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiPersonaServiceQuestionInput } from '@services/ai-server/ai-persona-service/dto/ai.persona.service.question.dto.input';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServer: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

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
    console.log(questionInput);
    return this.aiServer.askQuestion(
      questionInput as unknown as AiPersonaServiceQuestionInput,
      agentInfo,
      contextSapceNameID
    );
  }
}
