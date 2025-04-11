import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAiPersonaService } from './ai.persona.service.interface';
import {
  DeleteAiPersonaServiceInput,
  UpdateAiPersonaServiceInput,
} from './dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { AiPersonaServiceAuthorizationService } from './ai.persona.service.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@InstrumentResolver()
@Resolver(() => IAiPersonaService)
export class AiPersonaServiceResolverMutations {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private authorizationService: AuthorizationService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  @Mutation(() => IAiPersonaService, {
    description: 'Updates the specified AI Persona.',
  })
  @Profiling.api
  async aiServerUpdateAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaServiceData')
    aiPersonaServiceData: UpdateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaServiceData.ID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${aiPersonaService.id}`
    );

    const updatedAiPersonaService =
      await this.aiPersonaServiceService.updateAiPersonaService(
        aiPersonaServiceData
      );

    const authorizations =
      await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
        updatedAiPersonaService,
        updatedAiPersonaService.aiServer?.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return updatedAiPersonaService;
  }

  @Mutation(() => IAiPersonaService, {
    description: 'Deletes the specified AiPersonaService.',
  })
  async aiServerDeleteAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        deleteData.ID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${aiPersonaService.id}`
    );
    return await this.aiPersonaServiceService.deleteAiPersonaService(
      deleteData
    );
  }
}
