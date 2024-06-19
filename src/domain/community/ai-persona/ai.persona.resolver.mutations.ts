import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAiPersona } from './ai.persona.interface';
import { DeleteAiPersonaInput, UpdateAiPersonaInput } from './dto';

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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersona, {
    description: 'Deletes the specified AiPersona.',
  })
  async deleteAiPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersona = await this.aiPersonaService.getAiPersonaOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersona.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${aiPersona.id}`
    );
    return await this.aiPersonaService.deleteAiPersona(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Ingest the virtual contributor data / embeddings.',
  })
  @Profiling.api
  async ingest(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    return this.aiPersonaService.ingest(agentInfo);
  }
}
