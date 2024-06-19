import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AiPersona } from './ai.persona.entity';
import { IAiPersona } from './ai.persona.interface';
import { CreateAiPersonaInput as CreateAiPersonaInput } from './dto/ai.persona.dto.create';
import { DeleteAiPersonaInput as DeleteAiPersonaInput } from './dto/ai.persona.dto.delete';
import { UpdateAiPersonaInput } from './dto/ai.persona.dto.update';
import { IAiPersonaQuestionResult } from './dto/ai.persona.question.dto.result';
import { AiPersonaQuestionInput } from './dto/ai.persona.question.dto.input';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { AiServerAdapterAskQuestionInput } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.ask.question';

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
    aiPersona.description = aiPersonaData.description;
    //AiPersona.create(aiPersonaData);
    aiPersona.authorization = new AuthorizationPolicy();

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
    virtualID: string,
    options?: FindOneOptions<AiPersona>
  ): Promise<IAiPersona | never> {
    const aiPersona = await this.getAiPersona(virtualID, options);
    if (!aiPersona)
      throw new EntityNotFoundException(
        `Unable to find Virtual Persona with ID: ${virtualID}`,
        LogContext.PLATFORM
      );
    return aiPersona;
  }

  async save(aiPersona: IAiPersona): Promise<IAiPersona> {
    return await this.aiPersonaRepository.save(aiPersona);
  }

  public async askQuestion(
    personaQuestionInput: AiPersonaQuestionInput,
    agentInfo: AgentInfo,
    contextSpaceNameID: string
  ): Promise<IAiPersonaQuestionResult> {
    const aiPersona = await this.getAiPersonaOrFail(
      personaQuestionInput.aiPersonaID,
      {
        relations: {
          aiPersonaService: true,
        },
      }
    );

    if (!aiPersona.aiPersonaService) {
      throw new EntityNotFoundException(
        `Unable to find AI Persona Service for AI Persona with ID: ${personaQuestionInput.aiPersonaID}`,
        LogContext.PLATFORM
      );
    }

    this.logger.verbose?.(
      `Asking question to AI Persona from user ${agentInfo.userID} + with context ${contextSpaceNameID}`,
      LogContext.PLATFORM
    );

    const input: AiServerAdapterAskQuestionInput = {
      question: personaQuestionInput.question,
      personaServiceID: aiPersona.aiPersonaService.id,
    };

    return await this.aiServerAdapter.askQuestion(input);
  }
}
