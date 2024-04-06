import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualPersonaService } from './virtual.persona.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { VirtualPersonaAuthorizationService } from './virtual.persona.service.authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { VirtualPersonaAuthorizationResetInput } from './dto/virtual.persona.dto.reset.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IVirtualPersona } from './virtual.persona.interface';
import {
  CreateVirtualPersonaInput as CreateVirtualPersonaInput,
  DeleteVirtualPersonaInput,
  UpdateVirtualPersonaInput,
} from './dto';

@Resolver(() => IVirtualPersona)
export class VirtualPersonaResolverMutations {
  constructor(
    private virtualPersonaAuthorizationService: VirtualPersonaAuthorizationService,
    private virtualPersonaService: VirtualPersonaService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualPersona, {
    description: 'Creates a new VirtualPersona on the platform.',
  })
  @Profiling.api
  async createVirtualPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualPersonaData')
    virtualPersonaData: CreateVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Virtual persona: ${virtualPersonaData.engine}`
    );
    const virtual = await this.virtualPersonaService.createVirtualPersona(
      virtualPersonaData
    );

    return await this.virtualPersonaAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }

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
  @Mutation(() => IVirtualPersona, {
    description:
      'Reset the Authorization Policy on the specified VirtualPersona.',
  })
  @Profiling.api
  async authorizationPolicyResetOnVirtualPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: VirtualPersonaAuthorizationResetInput
  ): Promise<IVirtualPersona> {
    const virtual = await this.virtualPersonaService.getVirtualPersonaOrFail(
      authorizationResetData.virtualPersonaID,
      {
        relations: {},
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on VirtualPersona: ${authorizationResetData.virtualPersonaID}`
    );
    return await this.virtualPersonaAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    return this.virtualPersonaService.resetUserHistory(agentInfo);
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
