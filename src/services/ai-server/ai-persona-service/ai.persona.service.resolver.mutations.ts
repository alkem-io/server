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

@InstrumentResolver()
@Resolver(() => IAiPersonaService)
export class AiPersonaServiceResolverMutations {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private authorizationService: AuthorizationService
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

    return await this.aiPersonaServiceService.updateAiPersonaService(
      aiPersonaServiceData
    );
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
