import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AiPersona } from './ai.persona.entity';
import { IAiPersona } from './ai.persona.interface';
import { CreateAiPersonaInput } from './dto/ai.persona.dto.create';
import { DeleteAiPersonaInput } from './dto/ai.persona.dto.delete';
import { UpdateAiPersonaInput } from './dto/ai.persona.dto.update';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import {
  AiServerAdapterInvocationInput,
  InvocationResultAction,
} from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { AiPersonaInteractionMode } from '@common/enums/ai.persona.interaction.mode';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class AiPersonaService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(AiPersona)
    private aiPersonaRepository: Repository<AiPersona>,
    private aiServerAdapter: AiServerAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAiPersona(
    aiPersonaData: CreateAiPersonaInput
  ): Promise<IAiPersona> {
    let aiPersona: IAiPersona = new AiPersona();
    aiPersona.description = aiPersonaData.description ?? '';
    aiPersona.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.AI_PERSONA
    );
    aiPersona.bodyOfKnowledge = aiPersonaData.bodyOfKnowledge ?? '';
    aiPersona.dataAccessMode =
      AiPersonaDataAccessMode.SPACE_PROFILE_AND_CONTENTS;
    aiPersona.interactionModes = [AiPersonaInteractionMode.DISCUSSION_TAGGING];

    if (aiPersonaData.aiPersonaServiceID) {
      const personaService = await this.aiServerAdapter.getPersonaServiceOrFail(
        aiPersonaData.aiPersonaServiceID
      );

      this.aiServerAdapter.refreshBodyOfKnowledge(personaService.id);
      aiPersona.aiPersonaServiceID = personaService.id;
    } else if (aiPersonaData.aiPersonaService) {
      const aiPersonaService =
        await this.aiServerAdapter.createAiPersonaService(
          aiPersonaData.aiPersonaService
        );
      aiPersona.aiPersonaServiceID = aiPersonaService.id;
    }

    aiPersona = await this.aiPersonaRepository.save(aiPersona);
    this.logger.verbose?.(
      `Created new AI Persona with id ${aiPersona.id}`,
      LogContext.PLATFORM
    );

    return aiPersona;
  }

  async updateAiPersona(
    aiPersonaData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersona = await this.getAiPersonaOrFail(aiPersonaData.ID, {
      relations: { authorization: true },
    });

    return await this.aiPersonaRepository.save(aiPersona);
  }

  async refreshAllBodiesOfKnowledge(): Promise<boolean> {
    try {
      const allAiPersonaIDs = (
        await this.aiPersonaRepository.find({
          select: ['aiPersonaServiceID'],
        })
      ).map(persona => persona.aiPersonaServiceID);

      for (const personaID of allAiPersonaIDs) {
        this.aiServerAdapter.refreshBodyOfKnowledge(personaID);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error refreshing all bodies of knowledge: ${error}`,
        error,
        LogContext.PLATFORM
      );
      return false;
    }

    return true;
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
        `Unable to find all fields on Virtual Persona with ID: ${deleteData.ID}`,
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
        `Unable to find Virtual Persona with ID: ${aiPersonaID}`,
        LogContext.PLATFORM
      );
    return aiPersona;
  }

  async save(aiPersona: IAiPersona): Promise<IAiPersona> {
    return await this.aiPersonaRepository.save(aiPersona);
  }

  public invoke(
    aiPersona: IAiPersona,
    message: string,
    agentInfo: AgentInfo,
    contextSpaceID: string
  ): Promise<void> {
    this.logger.verbose?.(
      `Asking question to AI Persona from user ${agentInfo.userID} + with context ${contextSpaceID}`,
      LogContext.PLATFORM
    );

    const input: AiServerAdapterInvocationInput = {
      message,
      displayName: '',
      aiPersonaServiceID: aiPersona.aiPersonaServiceID,
      resultHandler: {
        action: InvocationResultAction.POST_REPLY,
      },
    };

    return this.aiServerAdapter.invoke(input);
  }
}
