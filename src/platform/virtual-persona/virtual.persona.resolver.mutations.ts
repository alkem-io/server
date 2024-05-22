import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualPersonaService } from './virtual.persona.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IVirtualPersona } from './virtual.persona.interface';
import { DeleteVirtualPersonaInput, UpdateVirtualPersonaInput } from './dto';

@Resolver(() => IVirtualPersona)
export class VirtualPersonaResolverMutations {
  constructor(
    private virtualPersonaService: VirtualPersonaService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualPersona, {
    description: 'Updates the specified VirtualPersona.',
  })
  @Profiling.api
  async updateVirtualPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualPersonaData') virtualPersonaData: UpdateVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const virtualPersona =
      await this.virtualPersonaService.getVirtualPersonaOrFail(
        virtualPersonaData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualPersona.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtualPersona.id}`
    );

    return await this.virtualPersonaService.updateVirtualPersona(
      virtualPersonaData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualPersona, {
    description: 'Deletes the specified VirtualPersona.',
  })
  async deleteVirtualPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const virtualPersona =
      await this.virtualPersonaService.getVirtualPersonaOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualPersona.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtualPersona.id}`
    );
    return await this.virtualPersonaService.deleteVirtualPersona(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Ingest the virtual contributor data / embeddings.',
  })
  @Profiling.api
  async ingest(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualPersonaService.ingest(agentInfo);
  }
}
