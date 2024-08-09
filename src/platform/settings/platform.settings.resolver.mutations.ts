import { Profiling, CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { PlatformSettingsService } from './platform.settings.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { UpdateInnovationHubPlatformSettingsInput } from './dto/innovation.hub.dto.update.settings';
import { UpdateVirtualContributorPlatformSettingsInput } from './dto/virtual.contributor.dto.update.settings';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class PlatformSettingsResolverMutations {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly organizationService: OrganizationService,
    private readonly authorizationService: AuthorizationService
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Updates the specified Organization platform settings.',
  })
  @Profiling.api
  async updateOrganizationPlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organizationData')
    organizationData: UpdateOrganizationPlatformSettingsInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationData.organizationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `organization update platform settings: ${organization.id}`
    );

    return await this.platformSettingsService.updateOrganizationPlatformSettings(
      organization,
      organizationData
    );
  }
}
