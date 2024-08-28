import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterAskQuestionInput } from './dto/ai.server.adapter.dto.ask.question';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { CreateAiPersonaServiceInput } from '@services/ai-server/ai-persona-service/dto';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { LogContext } from '@common/enums';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServer: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getBodyOfKnowledgeLastUpdated(
    personaServiceId: string
  ): Promise<Date | null> {
    return this.aiServer.getBodyOfKnowledgeLastUpdated(personaServiceId);
  }

  async refreshBodyOfKnowlege(personaServiceId: string): Promise<boolean> {
    this.logger.verbose?.(
      `Refresh body of knowledge mutation invoked for AI Persona service ${personaServiceId}`,
      LogContext.AI_SERVER_ADAPTER
    );
    return this.aiServer.ensurePersonaIsUsable(personaServiceId);
  }

  async ensureContextIsLoaded(spaceID: string): Promise<void> {
    await this.aiServer.ensureContextIsIngested(spaceID);
  }

  async getPersonaServiceBodyOfKnowledgeType(
    personaServiceId: string
  ): Promise<AiPersonaBodyOfKnowledgeType> {
    const aiPersonaService =
      await this.aiServer.getAiPersonaServiceOrFail(personaServiceId);
    return aiPersonaService.bodyOfKnowledgeType;
  }

  async getPersonaServiceBodyOfKnowledgeID(
    personaServiceId: string
  ): Promise<string> {
    const aiPersonaService =
      await this.aiServer.getAiPersonaServiceOrFail(personaServiceId);
    return aiPersonaService.bodyOfKnowledgeID;
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
    questionInput: AiServerAdapterAskQuestionInput
  ): Promise<IMessageAnswerToQuestion> {
    const vcInteractionID = questionInput.vcInteractionID;
    return this.aiServer.askQuestion({
      ...questionInput,
      interactionID: vcInteractionID,
    });
  }
}
