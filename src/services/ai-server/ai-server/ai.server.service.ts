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
import { CreateAiPersonaServiceInput } from '../ai-persona-service/dto';
import { AiPersonaServiceQuestionInput } from '../ai-persona-service/dto/ai.persona.service.question.dto.input';
import {
  IngestSpace,
  SpaceIngestionPurpose,
} from '@services/infrastructure/event-bus/commands';
import { EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
import { VcInteractionService } from '@domain/communication/vc-interaction/vc.interaction.service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import {
  InteractionMessage,
  MessageSenderRole,
} from '../ai-persona-service/dto/interaction.message';

@Injectable()
export class AiServerService {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    private vcInteractionService: VcInteractionService,
    private communicationAdapter: CommunicationAdapter,
    private config: ConfigService,
    @InjectRepository(AiServer)
    private aiServerRepository: Repository<AiServer>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private eventBus: EventBus
  ) {}

  async ensurePersonaIsUsable(personaServiceId: string): Promise<boolean> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        personaServiceId
      );
    await this.ensureSpaceBoNIsIngested(aiPersonaService.bodyOfKnowledgeID);
    return true;
  }

  public async ensureSpaceBoNIsIngested(spaceID: string): Promise<void> {
    this.eventBus.publish(
      new IngestSpace(spaceID, SpaceIngestionPurpose.KNOWLEDGE)
    );
  }

  public async ensureContextIsIngested(spaceID: string): Promise<void> {
    this.eventBus.publish(
      new IngestSpace(spaceID, SpaceIngestionPurpose.CONTEXT)
    );
  }

  public async askQuestion(
    questionInput: AiPersonaServiceQuestionInput
  ): Promise<IMessageAnswerToQuestion> {
    if (
      questionInput.contextID &&
      !(await this.isContextLoaded(questionInput.contextID))
    ) {
      this.eventBus.publish(
        new IngestSpace(questionInput.contextID, SpaceIngestionPurpose.CONTEXT)
      );
    }
    const history = await this.getInteractionMessages(
      questionInput.interactionID
    );

    return await this.aiPersonaServiceService.askQuestion(
      questionInput,
      history
    );
  }
  async getInteractionMessages(
    interactionID: string | undefined
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
    for (let i = 0; i < room.messages.length; i++) {
      const message = room.messages[i];
      if (message.threadID !== interaction.threadID) {
        continue;
      }

      let role = MessageSenderRole.USER;
      if (message.sender.startsWith('@virtualcontributor')) {
        role = MessageSenderRole.ASSISTANT;
      }

      messages.push({
        content: message.message,
        role,
      });
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
    return `${contextID}-${SpaceIngestionPurpose.CONTEXT}-slon`;
  }

  private async isContextLoaded(contextID: string): Promise<boolean> {
    const { host, port } = this.config.get(
      ConfigurationTypes.PLATFORM
    ).vector_db;
    const chroma = new ChromaClient({ path: `http://${host}:${port}` });

    const name = this.getContextCollectionID(contextID);
    try {
      // try to get the collection and return true if it is there
      await chroma.getCollection({ name });
      return true;
    } catch {
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
    server.aiPersonaServices = server.aiPersonaServices ?? [];
    server.aiPersonaServices.push(aiPersonaService);
    await this.saveAiServer(server);
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
    const result = await this.aiPersonaEngineAdapter.sendIngest(
      ingestAdapterInput
    );
    return result;
  }
}
