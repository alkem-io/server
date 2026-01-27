import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';

@InstrumentResolver()
@Resolver()
export class DomainPlatformSettingsResolverMutations {
  constructor(
    private readonly platformSettingsService: DomainPlatformSettingsService,
    private readonly organizationService: OrganizationService,
    private readonly authorizationService: AuthorizationService
  ) {}

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
