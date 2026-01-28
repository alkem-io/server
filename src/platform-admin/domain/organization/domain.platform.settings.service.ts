import { IOrganization } from '@domain/community/organization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateOrganizationPlatformSettingsInput } from './dto/organization.dto.update.platform.settings';

@Injectable()
export class DomainPlatformSettingsService {
  constructor(
    private readonly organizationService: OrganizationService,
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
