import { Profiling, CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { PlatformSettingsService } from './platform.settings.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { UpdateInnovationHubPlatformSettingsInput } from './dto/innovation.hub.dto.update.settings';
import { UpdateVirtualContributorPlatformSettingsInput } from './dto/virtual.contributor.dto.update.settings';

@Resolver()
export class PlatformSettingsResolverMutations {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService
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
    this.platformSettingsService.checkAuthorizationOrFail(
      agentInfo,
      'update innovation hub'
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
    this.platformSettingsService.checkAuthorizationOrFail(
      agentInfo,
      'update virtual contributor'
    );

    return await this.platformSettingsService.updateVirtualContributorPlatformSettingsOrFail(
      updateData
    );
  }
}
