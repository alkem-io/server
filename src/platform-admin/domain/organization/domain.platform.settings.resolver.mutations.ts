import { Profiling, CurrentUser } from '@common/decorators';
import { ActorContext } from '@core/actor-context';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentUser() actorContext: ActorContext,
    @Args('organizationData')
    organizationData: UpdateOrganizationPlatformSettingsInput
  ): Promise<IOrganization> {
    const organization =
      await this.organizationService.getOrganizationByIdOrFail(
        organizationData.organizationID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
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
