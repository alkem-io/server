import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAiPersona } from './ai.persona.interface';
import { UpdateAiPersonaInput } from './dto/ai.persona.dto.update';

@Resolver(() => IAiPersona)
export class AiPersonaResolverMutations {
  constructor(
    private aiPersonaService: AiPersonaService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersona, {
    description: 'Updates the specified AiPersona.',
  })
  @Profiling.api
  async updateAiPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaData') aiPersonaData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersona = await this.aiPersonaService.getAiPersonaOrFail(
      aiPersonaData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersona.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${aiPersona.id}`
    );

    return await this.aiPersonaService.updateAiPersona(aiPersonaData);
  }
}
