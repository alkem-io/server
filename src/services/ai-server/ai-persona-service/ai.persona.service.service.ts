import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AiPersonaService } from './ai.persona.service.entity';
import { IAiPersonaService } from './ai.persona.service.interface';
import { CreateAiPersonaServiceInput as CreateAiPersonaServiceInput } from './dto/ai.persona.service.dto.create';
import { DeleteAiPersonaServiceInput as DeleteAiPersonaServiceInput } from './dto/ai.persona..service.dto.delete';
import { UpdateAiPersonaServiceInput } from './dto/ai.persona.service.dto.update';
import { IAiPersonaServiceQuestionResult } from './dto/ai.persona.service.question.dto.result';
import { AiPersonaServiceQuestionInput } from './dto/ai.persona.service.question.dto.input';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AiPersonaEngineAdapterQueryInput } from '@services/ai-server/ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.question.input';
import { AiPersonaEngineAdapter } from '@services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { EventBus } from '@nestjs/cqrs';
import {
  IngestSpace,
  SpaceIngestionPurpose,
} from '@services/infrastructure/event-bus/commands';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';

@Injectable()
export class AiPersonaServiceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    private eventBus: EventBus,
    @InjectRepository(AiPersonaService)
    private aiPersonaServiceRepository: Repository<AiPersonaService>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAiPersonaService(
    aiPersonaServiceData: CreateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService: IAiPersonaService = new AiPersonaService();
    // TODO: map in the data   AiPersonaService.create(aiPersonaServiceData);
    aiPersonaService.authorization = new AuthorizationPolicy();

    aiPersonaService.bodyOfKnowledgeID = aiPersonaServiceData.bodyOfKnowledgeID;
    aiPersonaService.engine =
      aiPersonaServiceData.engine ?? AiPersonaEngine.EXPERT;
    aiPersonaService.bodyOfKnowledgeType =
      aiPersonaServiceData.bodyOfKnowledgeType ??
      AiPersonaBodyOfKnowledgeType.ALKEMIO_SPACE;
    aiPersonaService.prompt = aiPersonaServiceData.prompt ?? '';

    const savedAiPersonaService = await this.aiPersonaServiceRepository.save(
      aiPersonaService
    );
    this.logger.verbose?.(
      `Created new AI Persona Service with id ${aiPersonaService.id}`,
      LogContext.PLATFORM
    );

    if (aiPersonaServiceData.bodyOfKnowledgeID)
      this.eventBus.publish(
        new IngestSpace(
          aiPersonaServiceData.bodyOfKnowledgeID,
          SpaceIngestionPurpose.KNOWLEDGE
        )
      );

    return savedAiPersonaService;
  }

  async updateAiPersonaService(
    aiPersonaServiceData: UpdateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService = await this.getAiPersonaServiceOrFail(
      aiPersonaServiceData.ID
    );

    if (aiPersonaServiceData.prompt !== undefined) {
      aiPersonaService.prompt = aiPersonaServiceData.prompt;
    }

    if (aiPersonaServiceData.engine !== undefined) {
      aiPersonaService.engine = aiPersonaServiceData.engine;
    }

    return await this.aiPersonaServiceRepository.save(aiPersonaService);
  }

  async deleteAiPersonaService(
    deleteData: DeleteAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const personaID = deleteData.ID;

    const aiPersonaService = await this.getAiPersonaServiceOrFail(personaID, {
      relations: {
        authorization: true,
      },
    });
    if (!aiPersonaService.authorization) {
      throw new EntityNotFoundException(
        `Unable to find all fields on Virtual Persona with ID: ${deleteData.ID}`,
        LogContext.PLATFORM
      );
    }
    await this.authorizationPolicyService.delete(
      aiPersonaService.authorization
    );
    const result = await this.aiPersonaServiceRepository.remove(
      aiPersonaService as AiPersonaService
    );
    result.id = personaID;
    return result;
  }

  public async getAiPersonaService(
    aiPersonaServiceID: string,
    options?: FindOneOptions<AiPersonaService>
  ): Promise<IAiPersonaService | null> {
    const aiPersonaService = await this.aiPersonaServiceRepository.findOne({
      ...options,
      where: { ...options?.where, id: aiPersonaServiceID },
    });

    return aiPersonaService;
  }

  public async getAiPersonaServiceOrFail(
    virtualID: string,
    options?: FindOneOptions<AiPersonaService>
  ): Promise<IAiPersonaService | never> {
    const aiPersonaService = await this.getAiPersonaService(virtualID, options);
    if (!aiPersonaService)
      throw new EntityNotFoundException(
        `Unable to find Virtual Persona with ID: ${virtualID}`,
        LogContext.PLATFORM
      );
    return aiPersonaService;
  }

  async save(aiPersonaService: IAiPersonaService): Promise<IAiPersonaService> {
    return await this.aiPersonaServiceRepository.save(aiPersonaService);
  }

  public async askQuestion(
    personaQuestionInput: AiPersonaServiceQuestionInput,
    agentInfo: AgentInfo,
    contextSpaceID: string
  ): Promise<IAiPersonaServiceQuestionResult> {
    const aiPersonaService = await this.getAiPersonaServiceOrFail(
      personaQuestionInput.aiPersonaServiceID
    );

    const input: AiPersonaEngineAdapterQueryInput = {
      engine: aiPersonaService.engine,
      prompt: aiPersonaService.prompt,
      userId: agentInfo.userID,
      question: personaQuestionInput.question,
      knowledgeSpaceNameID: aiPersonaService.bodyOfKnowledgeID,
      contextSpaceNameID: contextSpaceID,
    };

    this.logger.error(input);
    const response = await this.aiPersonaEngineAdapter.sendQuery(input);

    return response;
  }

  public async ingest(aiPersonaService: IAiPersonaService): Promise<boolean> {
    // Todo: ???
    return this.aiPersonaEngineAdapter.sendIngest({
      engine: AiPersonaEngine.EXPERT,
      userId: aiPersonaService.id, // TODO: clearly wrong, just getting code to compile
    });
  }
}
