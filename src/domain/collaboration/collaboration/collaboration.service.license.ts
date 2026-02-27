import { LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CollaborationService } from './collaboration.service';

@Injectable()
export class CollaborationLicenseService {
  constructor(
    private licenseService: LicenseService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    collaborationID: string,
    parentLicense: ILicense
  ): Promise<ILicense[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(collaborationID, {
        relations: {
          license: {
            entitlements: true,
          },
        },
      });
    if (!collaboration.license || !collaboration.license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load Collaboration with entities at start of license reset: ${collaboration.id} `,
        LogContext.LICENSE
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    collaboration.license = this.licenseService.reset(collaboration.license);

    collaboration.license = await this.extendLicensePolicy(
      collaboration.license,
      parentLicense
    );

    updatedLicenses.push(collaboration.license);

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
    const parentEntitlements = parentLicense.entitlements;
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
        case LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER:
        case LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER:
          this.licenseService.findAndCopyParentEntitlement(
            entitlement,
            parentEntitlements
          );
          break;

        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for Collaboration: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }
}
