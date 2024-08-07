import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IOrganization } from '@domain/community/organization';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';
import { OrganizationService } from '@domain/community/organization/organization.service';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly organizationService: OrganizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async updateOrganizationPlatformSettings(
    organization: IOrganization,
    organizationData: UpdateOrganizationPlatformSettingsInput
  ): Promise<IOrganization> {
    if (
      organizationData.nameID.toLowerCase() !==
      organization.nameID.toLowerCase()
    ) {
      // updating the nameID, check new value is allowed
      await this.organizationService.checkNameIdOrFail(organizationData.nameID);
      organization.nameID = organizationData.nameID;
    }

    return await this.organizationService.save(organization);
  }
}
