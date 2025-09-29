import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAiPersona } from './ai.persona.interface';
import { DeleteAiPersonaInput, UpdateAiPersonaInput } from './dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IAiPersona)
export class AiPersonaResolverMutations {
  constructor(
    private aiPersonaService: AiPersonaService,
    private authorizationService: AuthorizationService
  ) {}

  @Mutation(() => IAiPersona, {
    description: 'Updates the specified AI Persona.',
  })
  @Profiling.api
  async aiServerUpdateAiPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaData')
    aiPersonaServiceData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersonaService = await this.aiPersonaService.getAiPersonaOrFail(
      aiPersonaServiceData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${aiPersonaService.id}`
    );

    return await this.aiPersonaService.updateAiPersona(aiPersonaServiceData);
  }

  @Mutation(() => IAiPersona, {
    description: 'Deletes the specified AiPersona.',
  })
  async aiServerDeleteAiPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersonaService = await this.aiPersonaService.getAiPersonaOrFail(
      deleteData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${aiPersonaService.id}`
    );
    return await this.aiPersonaService.deleteAiPersona(deleteData);
  }
}
