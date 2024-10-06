import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleSetService } from './role.set.service';

@Injectable()
export class RoleSetLicenseService {
  constructor(
    private licenseService: LicenseService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    roleSetID: string,
    parentLicense: ILicense
  ): Promise<ILicense[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(roleSetID, {
      relations: {
        license: {
          entitlements: true,
        },
      },
    });
    if (!roleSet.license || !roleSet.license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load RoleSet with entities at start of license reset: ${roleSet.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    roleSet.license = this.licenseService.reset(roleSet.license);

    roleSet.license = await this.extendLicensePolicy(
      roleSet.license,
      parentLicense
    );

    updatedLicenses.push(roleSet.license);

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    parentLicense: ILicense
  ): Promise<ILicense> {
    if (
      !license ||
      !license.entitlements ||
      !parentLicense ||
      !parentLicense.entitlements
    ) {
      throw new EntityNotInitializedException(
        'License or parent License with entitlements not found for RoleSet',
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS:
          const parentEntitlement = parentLicense.entitlements.find(
            e => e.type === entitlement.type
          );
          if (!parentEntitlement) {
            throw new RelationshipNotFoundException(
              `Parent entitlement not found for RoleSet: ${entitlement.type}`,
              LogContext.LICENSE
            );
          }
          entitlement.limit = parentEntitlement.limit;
          entitlement.enabled = parentEntitlement.enabled;
          break;

        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for RoleSet: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }
}
