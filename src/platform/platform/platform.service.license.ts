import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { PlatformService } from './platform.service';

@Injectable()
export class PlatformLicenseService {
  constructor(
    private platformService: PlatformService,
    private roleSetLicenseService: RoleSetLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(platformID: string): Promise<ILicense[]> {
    const roleSet = await this.platformService.getRoleSetOrFail(platformID);

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
    // create a single entitlement, showing that VCs are not enabled
    // TODO: the name of the entitlement will need to no longer be SPACE related
    const result: ILicenseEntitlement[] = [
      {
        id: '',
        type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        dataType: LicenseEntitlementDataType.FLAG,
        limit: 999,
        enabled: true,
      },
    ];
    return result;
  }
}
