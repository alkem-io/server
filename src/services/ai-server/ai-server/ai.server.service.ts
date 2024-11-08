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
import { AiPersonaEngineAdapter } from '../ai-persona-engine-adapter/ai.persona.engine.adapter';
import { AiServerIngestAiPersonaServiceInput } from './dto/ai.server.dto.ingest.ai.persona.service';
import { AiPersonaEngineAdapterInputBase } from '../ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.base';
import {
  CreateAiPersonaServiceInput,
  isInputValidForAction,
} from '../ai-persona-service/dto';
import { AiPersonaServiceInvocationInput } from '../ai-persona-service/dto/ai.persona.service.invocation.dto.input';
import {
  IngestSpace,
  SpaceIngestionPurpose,
} from '@services/infrastructure/event-bus/messages';
import { EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import { VcInteractionService } from '@domain/communication/vc-interaction/vc.interaction.service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
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
import { InvocationResultAction } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { RoomControllerService } from '@services/room-integration/room.controller.service';

@Injectable()
export class AiServerService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    private vcInteractionService: VcInteractionService,
    private communicationAdapter: CommunicationAdapter,
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

    await this.ensureSpaceBoNIsIngested(aiPersonaService);
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

      await this.subscriptionPublishService.publishVirtualContributorUpdated(
        virtualContributor
      );
    } else {
      this.logger.verbose?.(
        `VC for Persona service ${personaServiceId} not found.`,
        LogContext.AI_SERVER
      );
    }
  }

  public async ensureSpaceBoNIsIngested(
    persona: IAiPersonaService
  ): Promise<void> {
    this.logger.verbose?.(
      `AI Persona service ${persona.id} found for BOK refresh`,
      LogContext.AI_SERVER
    );
    this.eventBus.publish(
      new IngestSpace(
        persona.bodyOfKnowledgeID,
        SpaceIngestionPurpose.KNOWLEDGE,
        persona.id
      )
    );
  }

  public async ensureContextIsIngested(spaceID: string): Promise<void> {
    this.eventBus.publish(
      new IngestSpace(spaceID, SpaceIngestionPurpose.CONTEXT)
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
    ]);
    const loadHistory =
      HISTORY_ENABLED_ENGINES.has(personaService.engine) &&
      isInputValidForAction(invocationInput, InvocationResultAction.POST_REPLY);

    // history should be loaded trough the GQL API of the collaboration server
    let history: InteractionMessage[] = [];
    if (loadHistory) {
      const historyLimit = parseInt(
        this.config.get<number>(
          'platform.virtual_contributors.history_length',
          {
            infer: true,
          }
        )
      );

      history = await this.getLastNInteractionMessages(
        invocationInput.resultHandler.roomDetails!.vcInteractionID,
        historyLimit
      );
    }

    return this.aiPersonaServiceService.invoke(invocationInput, history);
  }
  async getLastNInteractionMessages(
    interactionID: string | undefined,
    limit: number = 10
  ): Promise<InteractionMessage[]> {
    if (!interactionID) {
      return [];
    }
    const interaction = await this.vcInteractionService.getVcInteractionOrFail(
      interactionID,
      {
        relations: {
          room: true,
        },
      }
    );

    const room = await this.communicationAdapter.getCommunityRoom(
      interaction.room.externalRoomID
    );

    const messages: InteractionMessage[] = [];

    for (let i = room.messages.length - 1; i >= 0; i--) {
      const message = room.messages[i];
      // try to skip this check and use Matrix to filter by Room and Thread
      if (
        message.threadID === interaction.threadID ||
        message.id === interaction.threadID
      ) {
        let role = MessageSenderRole.HUMAN;

        // try to set the assistant role for the replies of the specific persona/vc
        if (message.sender.startsWith('@virtualcontributor')) {
          role = MessageSenderRole.ASSISTANT;
        }

        messages.unshift({
          content: message.message,
          role,
        });
        if (messages.length === limit) {
          break;
        }
      }
    }

    return messages;
  }
  // TODO: send over the original question / answer? Send over the whole thread?
  // public async askFollowUpQuestion(
  //   questionInput: AiPersonaServiceQuestionInput
  // ): Promise<IMessageAnswerToQuestion> {
  //   if (
  //     questionInput.contextID &&
  //     !(await this.isContextLoaded(questionInput.contextID))
  //   ) {
  //     this.eventBus.publish(
  //       new IngestSpace(questionInput.contextID, SpaceIngestionPurpose.CONTEXT)
  //     );
  //   }

  //   return this.aiPersonaServiceService.askQuestion(questionInput);
  // }

  private getContextCollectionID(contextID: string): string {
    return `${contextID}-${SpaceIngestionPurpose.CONTEXT}`;
  }

  private async isContextLoaded(contextID: string): Promise<boolean> {
    const { host, port } = this.config.get('platform.vector_db', {
      infer: true,
    });
    const chroma = new ChromaClient({ path: `http://${host}:${port}` });

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
        aiPersonaService,
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

  public async ingestAiPersonaService(
    ingestData: AiServerIngestAiPersonaServiceInput
  ): Promise<boolean> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        ingestData.aiPersonaServiceID
      );
    const ingestAdapterInput: AiPersonaEngineAdapterInputBase = {
      engine: aiPersonaService.engine,
      userID: '',
    };
    const result =
      await this.aiPersonaEngineAdapter.sendIngest(ingestAdapterInput);
    return result;
  }

  public async handleInvokeEngineResult(event: InvokeEngineResult) {
    const resultHandler = event.original.resultHandler;
    //TODO use some sort of a factory when adding the next handler and DO NOT extend
    //this with elseif or switch
    if (
      isInputValidForAction(event.original, InvocationResultAction.POST_REPLY)
    )
      this.roomControllerService.postReply(
        resultHandler.roomDetails!,
        event.response
        // event.original.interactionID
      );
  }
}
