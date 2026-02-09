import { LogContext } from '@common/enums';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  CreateAiPersonaInput,
  UpdateAiPersonaInput,
} from '@services/ai-server/ai-persona';
import { IAiPersona } from '@services/ai-server/ai-persona/ai.persona.interface';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterInvocationInput } from './dto/ai.server.adapter.dto.invocation';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServerService: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async refreshBodyOfKnowledge(
    bokId: string,
    bokType: VirtualContributorBodyOfKnowledgeType,
    personaId: string
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Refresh body of knowledge mutation invoked for bokId: ${bokId}, bokType: ${bokType}, personaId: ${personaId}`,
      LogContext.AI_SERVER_ADAPTER
    );
    return this.aiServerService.ingestBodyOfKnowledge(
      bokId,
      bokType,
      personaId
    );
  }

  async ensureContextIsLoaded(spaceID: string): Promise<void> {
    await this.aiServerService.ensureContextIsIngested(spaceID);
  }

  async getPersonaEngine(personaId: string): Promise<AiPersonaEngine> {
    const aiPersona = await this.aiServerService.getAiPersonaOrFail(personaId);
    return aiPersona.engine;
  }

  async getPersonaOrFail(personaId: string): Promise<IAiPersona> {
    return this.aiServerService.getAiPersonaOrFail(personaId);
  }

  async createAPersona(personaData: CreateAiPersonaInput) {
    return this.aiServerService.createAiPersona(personaData);
  }

  async updateAiPersona(updateData: UpdateAiPersonaInput) {
    return this.aiServerService.updateAiPersona(updateData);
  }

  async applyAuthorizationOnAiPersona(
    personaID: string,
    parentAuthorization?: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy[]> {
    return await this.aiServerService.resetAuthorizationPolicyOnAiPersona(
      personaID,
      parentAuthorization
    );
  }

  async getAiServer() {
    return this.aiServerService.getAiServerOrFail();
  }

  invoke(invocationInput: AiServerAdapterInvocationInput): Promise<void> {
    return this.aiServerService.invoke({
      ...invocationInput,
      externalMetadata: invocationInput.externalMetadata || {},
    });
  }
}
