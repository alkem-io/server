import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { AiServer } from './ai.server.entity';
import { IAiServer } from './ai.server.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AiPersona, IAiPersona } from '@services/ai-server/ai-persona';
import { AiPersonaService } from '../ai-persona/ai.persona.service';
import { CreateAiPersonaInput, UpdateAiPersonaInput } from '../ai-persona/dto';
import { AiPersonaInvocationInput } from '../ai-persona/dto/ai.persona.invocation/ai.persona.invocation.dto.input';
import {
  IngestBodyOfKnowledge,
  IngestionPurpose,
} from '@services/infrastructure/event-bus/messages';
import { EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import {
  InteractionMessage,
  MessageSenderRole,
} from '../ai-persona/dto/interaction.message';
import { AlkemioConfig } from '@src/types';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { InvokeEngineResult } from '@services/infrastructure/event-bus/messages/invoke.engine.result';
import {} from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { InvocationResultAction } from '../ai-persona/dto/ai.persona.invocation/invocation.result.action.dto';
import { RoomDetails } from '../ai-persona/dto/ai.persona.invocation/room.details.dto';
import { RoomControllerService } from '@services/room-integration/room.controller.service';
import { IMessage } from '@domain/communication/message/message.interface';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IngestWebsite } from '@services/infrastructure/event-bus/messages/ingest.website';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { AiPersonaAuthorizationService } from '../ai-persona/ai.persona.service.authorization';
import { isInputValidForAction } from '@domain/community/virtual-contributor/dto';

@Injectable()
export class AiServerService {
  private INVOKE_ENGINE_RESULT_HANDLERS = {
    [InvocationResultAction.NONE]: () => {},
    [InvocationResultAction.POST_REPLY]: (event: InvokeEngineResult) => {
      if (
        isInputValidForAction(event.original, InvocationResultAction.POST_REPLY)
      ) {
        this.roomControllerService.postReply(event);
      }
    },
    [InvocationResultAction.POST_MESSAGE]: (event: InvokeEngineResult) => {
      if (
        isInputValidForAction(
          event.original,
          InvocationResultAction.POST_MESSAGE
        )
      ) {
        this.roomControllerService.postMessage(event);
      }
    },
  };

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiPersonaService: AiPersonaService,
    private subscriptionPublishService: SubscriptionPublishService,
    private config: ConfigService<AlkemioConfig, true>,
    private roomControllerService: RoomControllerService,
    private aiPersonaAuthorizationService: AiPersonaAuthorizationService,
    @InjectRepository(AiServer)
    private aiServerRepository: Repository<AiServer>,
    @InjectRepository(VirtualContributor)
    private vcRespository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private eventBus: EventBus
  ) {}

  public async updatePersonaBoKLastUpdated(
    personaServiceId: string,
    lastUpdated: Date | null
  ) {
    const persona =
      await this.aiPersonaService.getAiPersonaOrFail(personaServiceId);

    persona.bodyOfKnowledgeLastUpdated = lastUpdated;

    await this.aiPersonaService.save(persona);

    this.logger.verbose?.(
      `AI Persona service ${personaServiceId} bodyOfKnowledgeLastUpdated set to ${lastUpdated}`,
      LogContext.AI_SERVER
    );

    //TODO we shouldn't use the repository here but down the road this will e graphql call
    // from the AI to the Collaboration servers
    const virtualContributor = await this.vcRespository.findOne({
      where: {
        aiPersonaID: persona.id,
      },
    });

    if (virtualContributor) {
      this.logger.verbose?.(
        `VC for Persona service ${personaServiceId} loaded. Publishing to VirtualContributorUpdated subscription.`,
        LogContext.AI_SERVER
      );

      this.subscriptionPublishService.publishVirtualContributorUpdated(
        virtualContributor
      );
    } else {
      this.logger.verbose?.(
        `VC for Persona service ${personaServiceId} not found.`,
        LogContext.AI_SERVER
      );
    }
  }

  public async ingestBodyOfKnowledge(
    bokId: string,
    bokType: VirtualContributorBodyOfKnowledgeType,
    personaId: string
  ): Promise<boolean> {
    const persona = await this.aiPersonaService.getAiPersonaOrFail(personaId);

    this.logger.verbose?.(
      `AI Persona service ${persona.id} found for BOK refresh`,
      LogContext.AI_SERVER
    );
    if (persona.engine === AiPersonaEngine.GUIDANCE) {
      [
        'https://alkem.io/documentation',
        'https://www.alkemio.org',
        'https://welcome.alkem.io',
      ].map(url => {
        this.eventBus.publish(
          new IngestWebsite(
            url,
            VirtualContributorBodyOfKnowledgeType.WEBSITE,
            IngestionPurpose.KNOWLEDGE,
            persona.id
          )
        );
      });
      return true;
    }
    this.eventBus.publish(
      new IngestBodyOfKnowledge(
        bokId,
        bokType,
        IngestionPurpose.KNOWLEDGE,
        persona.id
      )
    );
    return true;
  }

  public async ensureContextIsIngested(spaceID: string): Promise<void> {
    this.eventBus.publish(
      new IngestBodyOfKnowledge(
        spaceID,
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.CONTEXT
      )
    );
  }

  public async invoke(
    invocationInput: AiPersonaInvocationInput
  ): Promise<void> {
    // the context is currently not used so no point in keeping this
    // commenting it out for now to save some work
    // if (
    //   questionInput.contextID &&
    //   !(await this.isContextLoaded(questionInput.contextID))
    // ) {
    //   this.eventBus.publish(
    //     new IngestSpace(questionInput.contextID, SpaceIngestionPurpose.CONTEXT)
    //   );
    // }

    const persona = await this.aiPersonaService.getAiPersonaOrFail(
      invocationInput.aiPersonaID
    );

    const HISTORY_ENABLED_ENGINES = new Set<AiPersonaEngine>([
      AiPersonaEngine.EXPERT,
      AiPersonaEngine.GUIDANCE,
      AiPersonaEngine.GENERIC_OPENAI,
      AiPersonaEngine.LIBRA_FLOW,
    ]);

    // history should be loaded trough the GQL API of the collaboration server
    let history: InteractionMessage[] = [];

    if (
      HISTORY_ENABLED_ENGINES.has(persona.engine) &&
      invocationInput.resultHandler.roomDetails
    ) {
      const historyLimit = parseInt(
        this.config.get<number>(
          'platform.virtual_contributors.history_length',
          {
            infer: true,
          }
        )
      );

      //NOTE this should not be needed when we start using the callout/post contents  in all engines
      const includeEntityContents = [
        AiPersonaEngine.LIBRA_FLOW,
        AiPersonaEngine.EXPERT,
      ].includes(persona.engine);

      history = await this.getLastNInteractionMessages(
        invocationInput.resultHandler.roomDetails,
        historyLimit,
        includeEntityContents
      );
    }

    return this.aiPersonaService.invoke(invocationInput, history);
  }

  async getLastNInteractionMessages(
    roomDetails: RoomDetails,
    // interactionID: string | undefined,
    limit: number = 100,
    includeEntityContents = false
  ): Promise<InteractionMessage[]> {
    let roomMessages: IMessage[] = [];
    // const room = await this.roomControllerService.getRoomOrFail(roomDetails.roomID);
    if (roomDetails.threadID) {
      roomMessages = await this.roomControllerService.getMessagesInThread(
        roomDetails.roomID,
        roomDetails.threadID
      );
    } else {
      roomMessages = await this.roomControllerService.getMessages(
        roomDetails.roomID
      );
    }

    const messages: InteractionMessage[] = [];

    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const message = roomMessages[i];
      let role = MessageSenderRole.HUMAN;

      // try to set the assistant role for the replies of the specific persona/vc
      if (message.sender.startsWith('@virtualcontributor')) {
        role = MessageSenderRole.ASSISTANT;
      }

      messages.unshift({
        content: message.message,
        role,
      });

      if (
        (includeEntityContents && messages.length === limit - 1) ||
        (!includeEntityContents && messages.length === limit)
      ) {
        break;
      }
    }
    if (includeEntityContents) {
      let entity = null;
      try {
        entity = await this.roomControllerService.getRoomEntityOrFail(
          roomDetails.roomID
        );
      } catch (error: any) {
        this.logger?.error(
          { message: 'Error getting post/callout for room', error },
          error.stack,
          LogContext.AI_SERVER
        );
        return messages;
      }

      let entityContent: string | undefined = '';
      if (entity instanceof Callout) {
        entityContent = entity?.framing?.profile?.description;
      }
      if (entity instanceof Post) {
        entityContent = entity?.profile?.description;
      }
      if (entityContent) {
        messages.unshift({
          content: entityContent,
          role: MessageSenderRole.HUMAN,
        });
      }
    }

    return messages;
  }
  private getContextCollectionID(contextID: string): string {
    return `${contextID}-${IngestionPurpose.CONTEXT}`;
  }

  private async isContextLoaded(contextID: string): Promise<boolean> {
    const { host, port, credentials } = this.config.get('platform.vector_db', {
      infer: true,
    });
    const chroma = new ChromaClient({
      path: `http://${host}:${port}`,
      auth: {
        provider: 'basic',
        credentials,
      },
    });

    const name = this.getContextCollectionID(contextID);
    try {
      // try to get the collection and return true if it is there
      await chroma.getCollection({ name });
      return true;
    } catch (err) {
      this.logger.error(
        `Error checking if context is loaded for contextID ${contextID}: ${err}`,
        LogContext.AI_SERVER
      );
      return false;
    }
  }

  async updateAiPersona(updateData: UpdateAiPersonaInput) {
    const aiPersona = await this.aiPersonaService.updateAiPersona(updateData);
    // TBD: trigger a re-ingest?
    return aiPersona;
  }

  async createAiPersona(personaData: CreateAiPersonaInput) {
    const server = await this.getAiServerOrFail({
      relations: { aiPersonas: true },
    });
    const aiPersona = await this.aiPersonaService.createAiPersona(
      personaData,
      server
    );
    aiPersona.aiServer = server;

    await this.aiPersonaService.save(aiPersona);

    const updatedAuthorizations =
      await this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
        aiPersona,
        server.authorization
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return aiPersona;
  }

  async getAiServerOrFail(
    options?: FindOneOptions<AiServer>
  ): Promise<IAiServer | never> {
    let aiServer: IAiServer | null = null;
    aiServer = (
      await this.aiServerRepository.find({ take: 1, ...options })
    )?.[0];

    if (!aiServer) {
      throw new EntityNotFoundException(
        'No AiServer found!',
        LogContext.AI_SERVER
      );
    }
    return aiServer;
  }

  async saveAiServer(aiServer: IAiServer): Promise<IAiServer> {
    return await this.aiServerRepository.save(aiServer);
  }

  async getAiPersonas(
    relations?: FindOptionsRelations<IAiServer>
  ): Promise<IAiPersona[]> {
    const aiServer = await this.getAiServerOrFail({
      relations: {
        aiPersonas: true,
        ...relations,
      },
    });
    const aiPersonas = aiServer.aiPersonas;
    if (!aiPersonas) {
      throw new EntityNotFoundException(
        'No AI Persona Services found!',
        LogContext.AI_PERSONA
      );
    }
    return aiPersonas;
  }

  async getDefaultAiPersonaOrFail(
    relations?: FindOptionsRelations<IAiServer>
  ): Promise<IAiPersona> {
    const aiServer = await this.getAiServerOrFail({
      relations: {
        defaultAiPersona: true,
        ...relations,
      },
    });
    const defaultAiPersonaService = aiServer.defaultAiPersona;
    if (!defaultAiPersonaService) {
      throw new EntityNotFoundException(
        'No default Virtual Personas found!',
        LogContext.AI_SERVER
      );
    }
    return defaultAiPersonaService;
  }

  public async getAiPersonaOrFail(
    virtualID: string,
    options?: FindOneOptions<AiPersona>
  ): Promise<IAiPersona | never> {
    return this.aiPersonaService.getAiPersonaOrFail(virtualID, options);
  }

  getAuthorizationPolicy(aiServer: IAiServer): IAuthorizationPolicy {
    const authorization = aiServer.authorization;

    if (!authorization) {
      throw new EntityNotFoundException(
        `Unable to find Authorization Policy for AiServer: ${aiServer.id}`,
        LogContext.AI_SERVER
      );
    }

    return authorization;
  }

  private async getAuthorizationPolicyAiServer(): Promise<IAuthorizationPolicy> {
    const aiServer = await this.getAiServerOrFail({
      relations: {
        authorization: true,
      },
    });
    if (!aiServer || !aiServer.authorization) {
      throw new EntityNotFoundException(
        `Unable to find Authorization Policy for AiServer: ${aiServer.id}`,
        LogContext.AI_SERVER
      );
    }
    const authorization = aiServer.authorization;

    if (!authorization) {
      throw new EntityNotFoundException(
        `Unable to find Authorization Policy for AiServer: ${aiServer.id}`,
        LogContext.AI_SERVER
      );
    }

    return authorization;
  }

  public async resetAuthorizationPolicyOnAiPersona(
    aiPersonaID: string,
    parentAuthorization?: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy[]> {
    const aiPersona =
      await this.aiPersonaService.getAiPersonaOrFail(aiPersonaID);

    return await this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
      aiPersona,
      parentAuthorization
    );
  }

  public async handleInvokeEngineResult(event: InvokeEngineResult) {
    const resultHandler = event.original.resultHandler;
    const handler = this.INVOKE_ENGINE_RESULT_HANDLERS[resultHandler.action];
    if (handler) {
      handler(event);
    }
  }
}
