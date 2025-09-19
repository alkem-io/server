import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AiPersona } from './ai.persona.entity';
import { IAiPersona } from './ai.persona.interface';
import {
  CreateAiPersonaInput,
  DeleteAiPersonaInput,
  UpdateAiPersonaInput,
  AiPersonaInvocationInput,
  InteractionMessage,
} from './dto';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AiPersonaEngineAdapter } from '@services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IExternalConfig } from './dto/external.config';
import { EncryptionService } from '@hedger/nestjs-encryption';
import { AiPersonaEngineAdapterInvocationInput } from '../ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.invocation.input';
import { IAiServer } from '../ai-server/ai.server.interface';

@Injectable()
export class AiPersonaService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    @InjectRepository(AiPersona)
    private aiPersonaRepository: Repository<AiPersona>,
    private readonly crypto: EncryptionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createAiPersona(
    aiPersonaData: CreateAiPersonaInput,
    aiServer: IAiServer
  ): Promise<IAiPersona> {
    const aiPersona: IAiPersona = new AiPersona();
    aiPersona.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.AI_PERSONA
    );
    aiPersona.aiServer = aiServer;

    aiPersona.engine = aiPersonaData.engine;
    aiPersona.prompt = aiPersonaData.prompt;
    aiPersona.externalConfig = this.encryptExternalConfig(
      aiPersonaData.externalConfig
    );

    const savedAiPersona = await this.aiPersonaRepository.save(aiPersona);
    this.logger.verbose?.(
      `Created new AI Persona with id ${aiPersona.id}`,
      LogContext.PLATFORM
    );

    return savedAiPersona;
  }

  async updateAiPersona(
    aiPersonaData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersona = await this.getAiPersonaOrFail(aiPersonaData.ID);

    if (aiPersonaData.prompt !== undefined) {
      aiPersona.prompt = aiPersonaData.prompt;
    }

    if (aiPersonaData.engine !== undefined) {
      aiPersona.engine = aiPersonaData.engine;
    }

    if (aiPersonaData.externalConfig !== undefined) {
      aiPersona.externalConfig = this.encryptExternalConfig({
        ...this.decryptExternalConfig(aiPersona.externalConfig || {}),
        ...aiPersonaData.externalConfig,
      });
    }

    await this.aiPersonaRepository.save(aiPersona);

    return await this.getAiPersonaOrFail(aiPersona.id);
  }

  async deleteAiPersona(deleteData: DeleteAiPersonaInput): Promise<IAiPersona> {
    const personaID = deleteData.ID;

    const aiPersona = await this.getAiPersonaOrFail(personaID, {
      relations: {
        authorization: true,
      },
    });
    if (!aiPersona.authorization) {
      throw new EntityNotFoundException(
        `Unable to find all fields on AI Persona with ID: ${deleteData.ID}`,
        LogContext.PLATFORM
      );
    }
    await this.authorizationPolicyService.delete(aiPersona.authorization);
    const result = await this.aiPersonaRepository.remove(
      aiPersona as AiPersona
    );
    result.id = personaID;
    return result;
  }

  public async getAiPersona(
    aiPersonaID: string,
    options?: FindOneOptions<AiPersona>
  ): Promise<IAiPersona | null> {
    const aiPersona = await this.aiPersonaRepository.findOne({
      ...options,
      where: { ...options?.where, id: aiPersonaID },
    });

    return aiPersona;
  }

  public async getAiPersonaOrFail(
    aiPersonaID: string,
    options?: FindOneOptions<AiPersona>
  ): Promise<IAiPersona | never> {
    const aiPersona = await this.getAiPersona(aiPersonaID, options);
    if (!aiPersona)
      throw new EntityNotFoundException(
        `Unable to find AI Persona with ID: ${aiPersonaID}`,
        LogContext.PLATFORM
      );
    return aiPersona;
  }

  async save(aiPersona: IAiPersona): Promise<IAiPersona> {
    return await this.aiPersonaRepository.save(aiPersona);
  }

  public async invoke(
    invocationInput: AiPersonaInvocationInput,
    history: InteractionMessage[]
  ): Promise<void> {
    const aiPersona = await this.getAiPersonaOrFail(
      invocationInput.aiPersonaID
    );

    const input: AiPersonaEngineAdapterInvocationInput = {
      operation: invocationInput.operation,
      engine: aiPersona.engine,
      prompt: aiPersona.prompt,
      userID: invocationInput.userID,
      message: invocationInput.message,
      bodyOfKnowledgeID: invocationInput.bodyOfKnowledgeID,
      contextID: invocationInput.contextID,
      history,
      interactionID: invocationInput.interactionID,
      externalMetadata: invocationInput.externalMetadata,
      displayName: invocationInput.displayName,
      description: invocationInput.description,
      externalConfig: this.decryptExternalConfig(aiPersona.externalConfig),
      resultHandler: invocationInput.resultHandler,
      personaServiceID: invocationInput.aiPersonaID,
      language: invocationInput.language,
    };

    return this.aiPersonaEngineAdapter.invoke(input);
  }

  public getAssistantID(externalConfig: IExternalConfig): string {
    const decoded = this.decryptExternalConfig(externalConfig);
    return decoded.assistantId || '';
  }

  public getApiKeyID(externalConfig: IExternalConfig): string {
    const { apiKey } = this.decryptExternalConfig(externalConfig);
    if (!apiKey) {
      return '';
    }
    return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` || '';
  }

  private encryptExternalConfig(
    config: IExternalConfig | undefined
  ): IExternalConfig {
    if (!config) {
      return {};
    }
    const result: IExternalConfig = { ...config };
    if (config.apiKey) {
      result.apiKey = this.crypto.encrypt(config.apiKey);
    }
    if (config.assistantId) {
      result.assistantId = this.crypto.encrypt(config.assistantId);
    }
    return result;
  }

  private decryptExternalConfig(
    config: IExternalConfig | undefined
  ): IExternalConfig {
    if (!config) {
      return {};
    }
    const result: IExternalConfig = { ...config };
    if (config.apiKey) {
      result.apiKey = this.crypto.decrypt(config.apiKey);
    }
    if (config.assistantId) {
      result.assistantId = this.crypto.decrypt(config.assistantId);
    }
    return result;
  }

  public async refreshAllBodiesOfKnowledge(): Promise<boolean> {
    // Get all AI Personas and refresh their bodies of knowledge
    const aiPersonas = await this.aiPersonaRepository.find();

    for (const aiPersona of aiPersonas) {
      this.logger.verbose?.(
        `Refreshing body of knowledge for AI Persona ${aiPersona.id}`,
        LogContext.AI_PERSONA
      );
      // TODO: Implement actual refresh logic
      // For now, just update the lastUpdated timestamp
      // aiPersona.bodyOfKnowledgeLastUpdated = new Date();
      await this.aiPersonaRepository.save(aiPersona);
    }

    return true;
  }
}
