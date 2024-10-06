import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceService } from './space.service';

@Injectable()
export class SpaceLicenseService {
  constructor(
    private licenseService: LicenseService,
    private spaceService: SpaceService,
    private licenseEngineService: LicenseEngineService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(spaceID: string): Promise<ILicense[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        agent: {
          credentials: true,
        },
        subspaces: true,
        license: {
          entitlements: true,
        },
      },
    });
    if (
      !space.subspaces ||
      !space.agent ||
      !space.license ||
      !space.license.entitlements
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of license reset: ${space.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    space.license = this.licenseService.reset(space.license);

    space.license = await this.extendLicensePolicy(space.license, space.agent);

    updatedLicenses.push(space.license);

    for (const subspace of space.subspaces) {
      const subspaceLicenses = await this.applyLicensePolicy(subspace.id);
      updatedLicenses.push(...subspaceLicenses);
    }

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    levelZeroSpaceAgent: IAgent
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        `License with entitlements not found for Space with agent ${levelZeroSpaceAgent.id}`,
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
          const createSpace = await this.licenseEngineService.isAccessGranted(
            LicensePrivilege.SPACE_SAVE_AS_TEMPLATE,
            levelZeroSpaceAgent
          );
          if (createSpace) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS:
          const createVirtualContributor =
            await this.licenseEngineService.isAccessGranted(
              LicensePrivilege.SPACE_VIRTUAL_CONTRIBUTOR_ACCESS,
              levelZeroSpaceAgent
            );
          if (createVirtualContributor) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER:
          const createInnovationHub =
            await this.licenseEngineService.isAccessGranted(
              LicensePrivilege.SPACE_WHITEBOARD_MULTI_USER,
              levelZeroSpaceAgent
            );
          if (createInnovationHub) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;

        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for Space: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }
}
