import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { OrganizationLookupService } from '../organization-lookup/organization.lookup.service';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';

@Injectable()
export class OrganizationLicenseService {
  constructor(
    private organizationLookupService: OrganizationLookupService,
    private roleSetLicenseService: RoleSetLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(organizationID: string): Promise<ILicense[]> {
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(
        organizationID,
        {
          relations: {
            agent: {
              credentials: true,
            },
            roleSet: true,
          },
        }
      );
    if (!organization.agent || !organization.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load Organization with entities at start of license reset: ${organization.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Hard coded org entitlements for now
    const orgEntitlements = this.createOrganizationEntitlements();

    const roleSetLicenses = await this.roleSetLicenseService.applyLicensePolicy(
      organization.roleSet.id,
      orgEntitlements
    );
    updatedLicenses.push(...roleSetLicenses);

    return updatedLicenses;
  }

  private createOrganizationEntitlements(): ILicenseEntitlement[] {
    // create a single entitlement, showing that VCs are not enabled
    const result: ILicenseEntitlement[] = [
      {
        id: '',
        type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        dataType: LicenseEntitlementDataType.FLAG,
        limit: 0,
        enabled: false,
      },
    ];
    return result;
  }
}
