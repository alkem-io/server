import { Profiling, CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class DomainPlatformSettingsResolverMutations {
  constructor(
    private readonly platformSettingsService: DomainPlatformSettingsService,
    private readonly organizationService: OrganizationService,
    private readonly authorizationService: AuthorizationService
  ) {}

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
