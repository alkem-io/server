import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAiPersonaService } from './ai.persona.service.interface';
import {
  DeleteAiPersonaServiceInput,
  UpdateAiPersonaServiceInput,
} from './dto';
import { AiPersonaIngestInput } from './dto/ai.persona.service.dto.ingest';

@Resolver(() => IAiPersonaService)
export class AiPersonaServiceResolverMutations {
  constructor(
    private aiPersonaServiceService: AiPersonaServiceService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersonaService, {
    description: 'Updates the specified AI Persona.',
  })
  @Profiling.api
  async updateAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaServiceData')
    aiPersonaServiceData: UpdateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaServiceData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${aiPersonaService.id}`
    );

    return await this.aiPersonaServiceService.updateAiPersonaService(
      aiPersonaServiceData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersonaService, {
    description: 'Deletes the specified AiPersonaService.',
  })
  async deleteAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${aiPersonaService.id}`
    );
    return await this.aiPersonaServiceService.deleteAiPersonaService(
      deleteData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description:
      'Trigger an ingesting of data on the remove AI Persona Service.',
  })
  async ingest(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ingestData')
    aiPersonaIngestData: AiPersonaIngestInput
  ): Promise<boolean> {
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(
        aiPersonaIngestData.aiPersonaServiceID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.UPDATE, // TODO: Separate privilege
      `ingesting on ai persona service: ${aiPersonaService.id}`
    );
    return this.aiPersonaServiceService.ingest(aiPersonaService);
  }
}
