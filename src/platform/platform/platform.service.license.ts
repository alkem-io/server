import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { PlatformService } from './platform.service';
import { LicenseEntitlementService } from '@domain/common/license-entitlement/license.entitlement.service';
import { CreateLicenseEntitlementInput } from '@domain/common/license-entitlement/dto/license.entitlement.dto.create';

@Injectable()
export class PlatformLicenseService {
  constructor(
    private platformService: PlatformService,
    private roleSetLicenseService: RoleSetLicenseService,
    private licenseEntitlementService: LicenseEntitlementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(): Promise<ILicense[]> {
    const roleSet = await this.platformService.getRoleSetOrFail();

    const updatedLicenses: ILicense[] = [];

    // Hard coded org entitlements for now
    const platformEntitlements = this.createPlatformEntitlements();

    const roleSetLicenses = await this.roleSetLicenseService.applyLicensePolicy(
      roleSet.id,
      platformEntitlements
    );
    updatedLicenses.push(...roleSetLicenses);

    return updatedLicenses;
  }

  private createPlatformEntitlements(): ILicenseEntitlement[] {
    const createLicenseInput: CreateLicenseEntitlementInput = {
      type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
      dataType: LicenseEntitlementDataType.FLAG,
      limit: 999,
      enabled: true,
    };
    // create a single entitlement, showing that VCs are not enabled
    // TODO: the name of the entitlement will need to no longer be SPACE related
    const result: ILicenseEntitlement =
      this.licenseEntitlementService.createEntitlement(createLicenseInput);
    // create a single entitlement, showing that VCs are not enabled

    return [result];
  }
}
