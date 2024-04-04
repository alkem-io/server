import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { VirtualContributorAuthorizationResetInput } from './dto/virtual.contributor.dto.reset.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IVirtualContributor } from './virtual.contributor.interface';
import {
  CreateVirtualContributorInput as CreateVirtualContributorInput,
  DeleteVirtualContributorInput,
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
    description: 'Creates a new VirtualContributor on the platform.',
  })
  @Profiling.api
  async createVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData')
    virtualContributorData: CreateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Virtual: ${virtualContributorData.nameID}`
    );
    const virtual = await this.virtualService.createVirtualContributor(
      virtualContributorData
    );

    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified VirtualContributor.',
  })
  @Profiling.api
  async updateVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData') virtualContributorData: UpdateVirtualInput
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualContributorData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtual.nameID}`
    );

    return await this.virtualService.updateVirtualContributor(
      virtualContributorData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Deletes the specified VirtualContributor.',
  })
  async deleteVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualContributorInput
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
    description:
      'Reset the Authorization Policy on the specified VirtualContributor.',
  })
  @Profiling.api
  async authorizationPolicyResetOnVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: VirtualContributorAuthorizationResetInput
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
      `reset authorization definition on VirtualContributor: ${authorizationResetData.virtualID}`
    );
    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }
}
