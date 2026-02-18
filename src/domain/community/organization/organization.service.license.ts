import { LogContext } from '@common/enums';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { ILicense } from '@domain/common/license/license.interface';
import { CreateLicenseEntitlementInput } from '@domain/common/license-entitlement/dto/license.entitlement.dto.create';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicenseEntitlementService } from '@domain/common/license-entitlement/license.entitlement.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OrganizationLookupService } from '../organization-lookup/organization.lookup.service';

@Injectable()
export class OrganizationLicenseService {
  constructor(
    private organizationLookupService: OrganizationLookupService,
    private roleSetLicenseService: RoleSetLicenseService,
    private licenseEntitlementService: LicenseEntitlementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(organizationID: string): Promise<ILicense[]> {
    const organization =
      await this.organizationLookupService.getOrganizationByIdOrFail(
        organizationID,
        {
          relations: {
            credentials: true,
            roleSet: true,
          },
        }
      );
    if (!organization.credentials || !organization.roleSet) {
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
    const createLicenseInput: CreateLicenseEntitlementInput = {
      type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_ACCESS,
      dataType: LicenseEntitlementDataType.FLAG,
      limit: 0,
      enabled: false,
    };
    // create a single entitlement, showing that VCs are not enabled
    const result: ILicenseEntitlement =
      this.licenseEntitlementService.createEntitlement(createLicenseInput);

    return [result];
  }
}
