import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { VirtualAuthorizationResetInput } from './dto/virtual.contributor.dto.reset.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IVirtualContributor } from './virtual.contributor.interface';
import {
  CreateVirtualInput,
  DeleteVirtualInput,
  UpdateVirtualInput,
} from './dto';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualAuthorizationService: VirtualContributorAuthorizationService,
    private virtualService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Creates a new Virtual on the platform.',
  })
  @Profiling.api
  async createVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualData') virtualData: CreateVirtualInput
  ): Promise<IVirtualContributor> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Virtual: ${virtualData.nameID}`
    );
    const virtual = await this.virtualService.createVirtualContributor(
      virtualData
    );

    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified Virtual.',
  })
  @Profiling.api
  async updateVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualData') virtualData: UpdateVirtualInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtual.nameID}`
    );

    return await this.virtualService.updateVirtualContributor(virtualData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Deletes the specified Virtual.',
  })
  async deleteVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualService.deleteVirtualContributor(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Reset the Authorization Policy on the specified Virtual.',
  })
  @Profiling.api
  async authorizationPolicyResetOnVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: VirtualAuthorizationResetInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      authorizationResetData.virtualID,
      {
        relations: {
          profile: {
            storageBucket: true,
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on virtual: ${authorizationResetData.virtualID}`
    );
    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }
}
