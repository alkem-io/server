import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EncryptionService } from '@hedger/nestjs-encryption';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AiPersonaEngineAdapter } from '@services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiPersonaEngineAdapterInvocationInput } from '../ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.invocation.input';
import { IAiServer } from '../ai-server/ai.server.interface';
import graphJson from '../prompt-graph/config/prompt.graph.expert.json';
import { aiPersonas } from './ai.persona.schema';
import { IAiPersona } from './ai.persona.interface';
import {
  AiPersonaInvocationInput,
  CreateAiPersonaInput,
  DeleteAiPersonaInput,
  InteractionMessage,
  UpdateAiPersonaInput,
} from './dto';
import { IExternalConfig } from './dto/external.config';

@Injectable()
export class AiPersonaService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly crypto: EncryptionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createAiPersona(
    aiPersonaData: CreateAiPersonaInput,
    aiServer: IAiServer
  ): Promise<IAiPersona> {
    const authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.AI_PERSONA
    );

    const [savedAiPersona] = await this.db
      .insert(aiPersonas)
      .values({
        engine: aiPersonaData.engine,
        prompt: aiPersonaData.prompt,
        externalConfig: this.encryptExternalConfig(
          aiPersonaData.externalConfig
        ),
        aiServerId: aiServer.id,
      })
      .returning();

    const result = savedAiPersona as unknown as IAiPersona;
    result.authorization = authorization;
    result.aiServer = aiServer;

    this.logger.verbose?.(
      `Created new AI Persona with id ${result.id}`,
      LogContext.PLATFORM
    );

    return result;
  }

  async updateAiPersona(
    aiPersonaData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersona = await this.getAiPersonaOrFail(aiPersonaData.ID);

    const updateData: Record<string, unknown> = {};

    if (aiPersonaData.prompt !== undefined) {
      updateData.prompt = aiPersonaData.prompt;
    }

    if (aiPersonaData.engine !== undefined) {
      updateData.engine = aiPersonaData.engine;
    }

    if (aiPersonaData.externalConfig !== undefined) {
      updateData.externalConfig = this.encryptExternalConfig({
        ...this.decryptExternalConfig(aiPersona.externalConfig || {}),
        ...aiPersonaData.externalConfig,
      });
    }
    if (aiPersonaData.promptGraph !== undefined) {
      // If explicitly set to null, clear the entire promptGraph
      if (aiPersonaData.promptGraph === null) {
        aiPersona.promptGraph = null;
      } else {
        // Otherwise do partial updates
        aiPersona.promptGraph = aiPersona.promptGraph || {};
        const promptGraphData = aiPersonaData.promptGraph;
        if (promptGraphData.nodes !== undefined) {
          aiPersona.promptGraph.nodes = promptGraphData.nodes;
        }
        if (promptGraphData.edges !== undefined) {
          aiPersona.promptGraph.edges = promptGraphData.edges;
        }
        if (promptGraphData.start !== undefined) {
          aiPersona.promptGraph.start = promptGraphData.start;
        }
        if (promptGraphData.end !== undefined) {
          aiPersona.promptGraph.end = promptGraphData.end;
        }
        if (promptGraphData.state !== undefined) {
          aiPersona.promptGraph.state = promptGraphData.state;
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.db
        .update(aiPersonas)
        .set(updateData)
        .where(eq(aiPersonas.id, aiPersona.id));
    }

    return await this.getAiPersonaOrFail(aiPersona.id);
  }

  async deleteAiPersona(deleteData: DeleteAiPersonaInput): Promise<IAiPersona> {
    const personaID = deleteData.ID;

    const aiPersona = await this.getAiPersonaOrFail(personaID, {
      with: {
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
    await this.db.delete(aiPersonas).where(eq(aiPersonas.id, personaID));
    aiPersona.id = personaID;
    return aiPersona;
  }

  public async getAiPersona(
    aiPersonaID: string,
    options?: { with?: Record<string, boolean> }
  ): Promise<IAiPersona | null> {
    const aiPersona = await this.db.query.aiPersonas.findFirst({
      where: eq(aiPersonas.id, aiPersonaID),
      with: options?.with,
    });

    return (aiPersona as unknown as IAiPersona) ?? null;
  }

  public async getAiPersonaOrFail(
    aiPersonaID: string,
    options?: { with?: Record<string, boolean> }
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
    if (aiPersona.id) {
      const [updated] = await this.db
        .update(aiPersonas)
        .set({
          engine: aiPersona.engine,
          prompt: aiPersona.prompt,
          externalConfig: aiPersona.externalConfig,
          bodyOfKnowledgeLastUpdated: aiPersona.bodyOfKnowledgeLastUpdated,
          promptGraph: aiPersona.promptGraph,
          aiServerId: aiPersona.aiServer?.id,
        })
        .where(eq(aiPersonas.id, aiPersona.id))
        .returning();
      return updated as unknown as IAiPersona;
    }
    const [created] = await this.db
      .insert(aiPersonas)
      .values({
        engine: aiPersona.engine,
        prompt: aiPersona.prompt,
        externalConfig: aiPersona.externalConfig,
        bodyOfKnowledgeLastUpdated: aiPersona.bodyOfKnowledgeLastUpdated,
        promptGraph: aiPersona.promptGraph,
        aiServerId: aiPersona.aiServer?.id,
      })
      .returning();
    return created as unknown as IAiPersona;
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
      personaID: invocationInput.aiPersonaID,
      language: invocationInput.language,
    };

    if (
      input.engine === AiPersonaEngine.EXPERT &&
      !invocationInput.promptGraph
    ) {
      let invocationGraph = aiPersona.promptGraph;
      if (!invocationGraph) {
        // Deep-clone the imported graphJson so we don't mutate the module-level object
        const processedGraph = JSON.parse(JSON.stringify(graphJson));
        // For each node, if prompt is an array, concatenate it into a single string with new lines
        processedGraph.nodes?.forEach((node: any) => {
          if (Array.isArray(node.prompt)) {
            node.prompt = node.prompt.join('\n');
          }
        });
        invocationGraph = processedGraph;
      }

      // Only assign if we have a valid graph (not null/undefined)
      if (invocationGraph) {
        input.promptGraph = invocationGraph;
      }
    }

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
}
