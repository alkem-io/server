import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { AiServer } from './ai.server.entity';
import { IAiServer } from './ai.server.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  AiPersonaService,
  IAiPersonaService,
} from '@services/ai-server/ai-persona-service';
import { AiPersonaServiceService } from '../ai-persona-service/ai.persona.service.service';
import {
  CreateAiPersonaServiceInput,
  isInputValidForAction,
  UpdateAiPersonaServiceInput,
} from '../ai-persona-service/dto';
import { AiPersonaServiceInvocationInput } from '../ai-persona-service/dto/ai.persona.service.invocation.dto.input';
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
} from '../ai-persona-service/dto/interaction.message';
import { AlkemioConfig } from '@src/types';
import { AiPersonaServiceAuthorizationService } from '@services/ai-server/ai-persona-service/ai.persona.service.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { InvokeEngineResult } from '@services/infrastructure/event-bus/messages/invoke.engine.result';
import {
  InvocationResultAction,
  RoomDetails,
} from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { RoomControllerService } from '@services/room-integration/room.controller.service';
import { IMessage } from '@domain/communication/message/message.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { IngestWebsite } from '@services/infrastructure/event-bus/messages/ingest.website';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';

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
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService,
    private subscriptionPublishService: SubscriptionPublishService,
    private config: ConfigService<AlkemioConfig, true>,
    private roomControllerService: RoomControllerService,
    @InjectRepository(AiServer)
    private aiServerRepository: Repository<AiServer>,
    @InjectRepository(VirtualContributor)
    private vcRespository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private eventBus: EventBus
  ) {}

  async getBodyOfKnowledgeLastUpdated(
    personaServiceId: string
  ): Promise<Date | null> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        personaServiceId
      );
    return aiPersonaService.bodyOfKnowledgeLastUpdated;
  }

  async ensurePersonaIsUsable(personaServiceId: string): Promise<boolean> {
    this.logger.verbose?.(
      `AI server ensurePersonaIsUsable for AI Persona service ${personaServiceId} invoked`,
      LogContext.AI_SERVER
    );

    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        personaServiceId
      );
    this.logger.verbose?.(
      `AI Persona service ${personaServiceId} found for BOK refresh`,
      LogContext.AI_SERVER
    );

    await this.ensureBoNIsIngested(aiPersonaService);
    return true;
  }

  public async updatePersonaBoKLastUpdated(
    personaServiceId: string,
    lastUpdated: Date | null
  ) {
    const personaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        personaServiceId
      );

    personaService.bodyOfKnowledgeLastUpdated = lastUpdated;

    await this.aiPersonaServiceService.save(personaService);

    this.logger.verbose?.(
      `AI Persona service ${personaServiceId} bodyOfKnowledgeLastUpdated set to ${lastUpdated}`,
      LogContext.AI_SERVER
    );

    //TODO we shouldn't use the repository here but down the road this will e graphql call
    // from the AI to the Collaboration servers
    const virtualContributor = await this.vcRespository.findOne({
      where: {
        aiPersona: {
          aiPersonaServiceID: personaService.id,
        },
      },
      relations: { aiPersona: true },
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

  public async ensureBoNIsIngested(persona: IAiPersonaService): Promise<void> {
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
            AiPersonaBodyOfKnowledgeType.WEBSITE,
            IngestionPurpose.KNOWLEDGE,
            persona.id
          )
        );
      });
      return;
    }
    this.eventBus.publish(
      new IngestBodyOfKnowledge(
        persona.bodyOfKnowledgeID,
        persona.bodyOfKnowledgeType,
        IngestionPurpose.KNOWLEDGE,
        persona.id
      )
    );
  }

  public async ensureContextIsIngested(spaceID: string): Promise<void> {
    this.eventBus.publish(
      new IngestBodyOfKnowledge(
        spaceID,
        AiPersonaBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.CONTEXT
      )
    );
  }

  public async invoke(
    invocationInput: AiPersonaServiceInvocationInput
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

    const personaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        invocationInput.aiPersonaServiceID
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
      HISTORY_ENABLED_ENGINES.has(personaService.engine) &&
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
      ].includes(personaService.engine);

      history = await this.getLastNInteractionMessages(
        invocationInput.resultHandler.roomDetails,
        historyLimit,
        includeEntityContents
      );
    }

    return this.aiPersonaServiceService.invoke(invocationInput, history);
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
      const entity = await this.roomControllerService.getRoomEntityOrFail(
        roomDetails.roomID
      );
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

  async updateAiPersonaService(updateData: UpdateAiPersonaServiceInput) {
    const aiPersonaService =
      await this.aiPersonaServiceService.updateAiPersonaService(updateData);

    // TBD: trigger a re-ingest?

    return aiPersonaService;
  }

  async createAiPersonaService(
    personaServiceData: CreateAiPersonaServiceInput
  ) {
    const server = await this.getAiServerOrFail({
      relations: { aiPersonaServices: true },
    });
    const aiPersonaService =
      await this.aiPersonaServiceService.createAiPersonaService(
        personaServiceData
      );
    aiPersonaService.aiServer = server;

    await this.aiPersonaServiceService.save(aiPersonaService);

    const updatedAuthorizations =
      await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
        aiPersonaService.id,
        server.authorization
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return aiPersonaService;
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

  async getAiPersonaServices(
    relations?: FindOptionsRelations<IAiServer>
  ): Promise<IAiPersonaService[]> {
    const aiServer = await this.getAiServerOrFail({
      relations: {
        aiPersonaServices: true,
        ...relations,
      },
    });
    const aiPersonaServices = aiServer.aiPersonaServices;
    if (!aiPersonaServices) {
      throw new EntityNotFoundException(
        'No AI Persona Services found!',
        LogContext.AI_PERSONA_SERVICE
      );
    }
    return aiPersonaServices;
  }

  async getDefaultAiPersonaServiceOrFail(
    relations?: FindOptionsRelations<IAiServer>
  ): Promise<IAiPersonaService> {
    const aiServer = await this.getAiServerOrFail({
      relations: {
        defaultAiPersonaService: true,
        ...relations,
      },
    });
    const defaultAiPersonaService = aiServer.defaultAiPersonaService;
    if (!defaultAiPersonaService) {
      throw new EntityNotFoundException(
        'No default Virtual Personas found!',
        LogContext.AI_SERVER
      );
    }
    return defaultAiPersonaService;
  }

  public async getAiPersonaServiceOrFail(
    virtualID: string,
    options?: FindOneOptions<AiPersonaService>
  ): Promise<IAiPersonaService | never> {
    return await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
      virtualID,
      options
    );
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

  public async resetAuthorizationPolicyOnAiPersonaService(
    aiPersonaServiceID: string
  ): Promise<IAuthorizationPolicy[]> {
    const aiServerAuthorization = await this.getAuthorizationPolicyAiServer();

    return await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
      aiPersonaServiceID,
      aiServerAuthorization
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
