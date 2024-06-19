import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAiServer } from './ai.server.interface';
import { AiServerAuthorizationService } from './ai.server.service.authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AiServerService } from './ai.server.service';
import { AssignAiServerRoleToUserInput } from './dto/ai.server.dto.assign.role.user';
import { AiPersonaServiceService } from '../ai-persona-service/ai.persona.service.service';
import { AiPersonaServiceAuthorizationService } from '../ai-persona-service/ai.persona.service.authorization';
import { RemoveAiServerRoleFromUserInput } from './dto/ai.server.dto.remove.role.user';
import { CreateAiPersonaServiceInput } from '../ai-persona-service/dto/ai.persona.service.dto.create';
import { IAiPersonaService } from '../ai-persona-service/ai.persona.service.interface';

@Resolver()
export class AiServerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aiServerService: AiServerService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiServer, {
    description: 'Reset the Authorization Policy on the specified AiServer.',
  })
  async authorizationPolicyResetOnAiServer(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IAiServer> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on aiServer: ${agentInfo.email}`
    );
    return await this.aiServerAuthorizationService.applyAuthorizationPolicy();
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a aiServer role to a User.',
  })
  async assignAiServerRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignAiServerRoleToUserInput
  ): Promise<IUser> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    const privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      privilegeRequired,
      `assign user aiServer role admin: ${membershipData.userID} - ${membershipData.role}`
    );
    const user = await this.aiServerService.assignAiServerRoleToUser(
      membershipData
    );

    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from a aiServer role.',
  })
  async removeAiServerRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveAiServerRoleFromUserInput
  ): Promise<IUser> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    const privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      privilegeRequired,
      `remove user aiServer role: ${membershipData.userID} - ${membershipData.role}`
    );
    const user = await this.aiServerService.removeAiServerRoleFromUser(
      membershipData
    );
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersonaService, {
    description: 'Creates a new AiPersonaService on the aiServer.',
  })
  async createAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaServiceData')
    aiPersonaServiceData: CreateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `create Virtual persona: ${aiPersonaServiceData.engine}`
    );
    let aiPersonaService =
      await this.aiPersonaServiceService.createAiPersonaService(
        aiPersonaServiceData
      );

    aiPersonaService =
      await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
        aiPersonaService,
        aiServer.authorization
      );

    aiPersonaService.aiServer = aiServer;

    await this.aiPersonaServiceService.save(aiPersonaService);

    return aiPersonaService;
  }
}
