import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterInvocationInput } from './dto/ai.server.adapter.dto.invocation';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { LogContext } from '@common/enums';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  CreateAiPersonaInput,
  UpdateAiPersonaInput,
} from '@services/ai-server/ai-persona';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServer: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getBodyOfKnowledgeLastUpdated(personaId: string): Promise<Date | null> {
    return this.aiServer.getBodyOfKnowledgeLastUpdated(personaId);
  }

  async refreshBodyOfKnowledge(personaId: string): Promise<boolean> {
    this.logger.verbose?.(
      `Refresh body of knowledge mutation invoked for AI Persona service ${personaId}`,
      LogContext.AI_SERVER_ADAPTER
    );
    return this.aiServer.ensurePersonaIsUsable(personaId);
  }

  async ensureContextIsLoaded(spaceID: string): Promise<void> {
    await this.aiServer.ensureContextIsIngested(spaceID);
  }

  async getPersonaBodyOfKnowledgeType(
    personaId: string
  ): Promise<AiPersonaBodyOfKnowledgeType> {
    const aiPersona = await this.aiServer.getAiPersonaOrFail(personaId);
    return aiPersona.bodyOfKnowledgeType;
  }

  async getPersonaEngine(personaServiceId: string): Promise<AiPersonaEngine> {
    const aiPersona = await this.aiServer.getAiPersonaOrFail(personaServiceId);
    return aiPersona.engine;
  }

  async getPersonaBodyOfKnowledgeID(personaServiceId: string): Promise<string> {
    const aiPersona = await this.aiServer.getAiPersonaOrFail(personaServiceId);
    return aiPersona.bodyOfKnowledgeID;
  }

  async getPersonaOrFail(personaId: string): Promise<IAiPersona> {
    return this.aiServer.getAiPersonaOrFail(personaId);
  }

  async createAPersona(personaServiceData: CreateAiPersonaInput) {
    return this.aiServer.createAiPersona(personaServiceData);
  }

  async updateAiPersona(updateData: UpdateAiPersonaInput) {
    return this.aiServer.updateAiPersonaService(updateData);
  }

  async resetAuthorizationOnAiPersona(
    personaServiceID: string
  ): Promise<IAuthorizationPolicy[]> {
    return await this.aiServer.resetAuthorizationPolicyOnAiPersona(
      personaServiceID
    );
  }

  async getAiServer() {
    return this.aiServer.getAiServerOrFail();
  }

  invoke(invocationInput: AiServerAdapterInvocationInput): Promise<void> {
    return this.aiServer.invoke({
      ...invocationInput,
      externalMetadata: invocationInput.externalMetadata || {},
    });
  }
}
