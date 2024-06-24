import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { AiServer } from './ai.server.entity';
import { IAiServer } from './ai.server.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RemoveAiServerRoleFromUserInput } from './dto/ai.server.dto.remove.role.user';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignAiServerRoleToUserInput } from './dto/ai.server.dto.assign.role.user';
import {
  AiPersonaService,
  IAiPersonaService,
} from '@services/ai-server/ai-persona-service';
import { AiPersonaServiceService } from '../ai-persona-service/ai.persona.service.service';
import { AiServerRole } from '@common/enums/ai.server.role';
import { AiPersonaEngineAdapter } from '../ai-persona-engine-adapter/ai.persona.engine.adapter';
import { AiServerIngestAiPersonaServiceInput } from './dto/ai.server.dto.ingest.ai.persona.service';
import { AiPersonaEngineAdapterInputBase } from '../ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.base';
import { CreateAiPersonaServiceInput } from '../ai-persona-service/dto';
import { AiServerAdapterAskQuestionInput } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.ask.question';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiPersonaServiceQuestionInput } from '../ai-persona-service/dto/ai.persona.service.question.dto.input';

@Injectable()
export class AiServerService {
  constructor(
    // private userService: UserService,
    // private agentService: AgentService,
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaEngineAdapter: AiPersonaEngineAdapter,
    @InjectRepository(AiServer)
    private aiServerRepository: Repository<AiServer>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async askQuestion(
    questionInput: AiPersonaServiceQuestionInput,
    agentInfo: AgentInfo,
    contextSapceNameID: string
  ) {
    return this.aiPersonaServiceService.askQuestion(
      questionInput,
      agentInfo,
      contextSapceNameID
    );
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

  // public async assignAiServerRoleToUser(
  //   assignData: AssignAiServerRoleToUserInput
  // ): Promise<IUser> {
  //   const agent = await this.userService.getAgent(assignData.userID);

  //   const credential = this.getCredentialForRole(assignData.role);

  //   // assign the credential
  //   await this.agentService.grantCredential({
  //     agentID: agent.id,
  //     ...credential,
  //   });

  //   return await this.userService.getUserWithAgent(assignData.userID);
  // }

  // public async removeAiServerRoleFromUser(
  //   removeData: RemoveAiServerRoleFromUserInput
  // ): Promise<IUser> {
  //   const agent = await this.userService.getAgent(removeData.userID);

  //   // Validation logic
  //   if (removeData.role === AiServerRole.GLOBAL_ADMIN) {
  //     // Check not the last global admin
  //     await this.removeValidationSingleGlobalAdmin();
  //   }

  //   const credential = this.getCredentialForRole(removeData.role);

  //   await this.agentService.revokeCredential({
  //     agentID: agent.id,
  //     ...credential,
  //   });

  //   return await this.userService.getUserWithAgent(removeData.userID);
  // }

  public async ingestAiPersonaService(
    ingestData: AiServerIngestAiPersonaServiceInput
  ): Promise<boolean> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        ingestData.aiPersonaServiceID
      );
    const ingestAdapterInput: AiPersonaEngineAdapterInputBase = {
      engine: aiPersonaService.engine,
      userId: '',
    };
    const result = await this.aiPersonaEngineAdapter.sendIngest(
      ingestAdapterInput
    );
    return result;
  }

  // private async removeValidationSingleGlobalAdmin(): Promise<boolean> {
  //   // Check more than one
  //   const globalAdmins = await this.userService.usersWithCredentials({
  //     type: AuthorizationCredential.GLOBAL_ADMIN,
  //   });
  //   if (globalAdmins.length < 2)
  //     throw new ForbiddenException(
  //       `Not allowed to remove ${AuthorizationCredential.GLOBAL_ADMIN}: last AI Server global-admin`,
  //       LogContext.AUTH
  //     );

  //   return true;
  // }

  private getCredentialForRole(role: AiServerRole): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: '',
    };
    switch (role) {
      case AiServerRole.GLOBAL_ADMIN:
        result.type = AuthorizationCredential.GLOBAL_ADMIN;
        break;
      case AiServerRole.SUPPORT:
        result.type = AuthorizationCredential.GLOBAL_SUPPORT;
        break;
      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AI_SERVER
        );
    }
    return result;
  }
}
