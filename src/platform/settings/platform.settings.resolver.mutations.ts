import { Profiling, CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformSettingsService } from './platform.settings.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { UpdateInnovationHubPlatformSettingsInput } from './dto/innovation.hub.dto.update.settings';
import { UpdateVirtualContributorPlatformSettingsInput } from './dto/virtual.contributor.dto.update.settings';

@Resolver()
export class PlatformSettingsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformSettingsService: PlatformSettingsService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Update Innovation Hub Settings.',
  })
  @Profiling.api
  async updateInnovationHubPlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateInnovationHubPlatformSettingsInput
  ): Promise<IInnovationHub> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'update innovation space'
    );

    return await this.platformSettingsService.updateInnovationHubPlatformSettingsOrFail(
      updateData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Update VirtualContributor Platform Settings.',
  })
  async updateVirtualContributorPlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateVirtualContributorPlatformSettingsInput
  ): Promise<IVirtualContributor> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'update virtual contributor'
    );

    return await this.platformSettingsService.updateVirtualContributorPlatformSettingsOrFail(
      updateData
    );
  }
}
