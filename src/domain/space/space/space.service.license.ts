import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceService } from './space.service';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';

@Injectable()
export class SpaceLicenseService {
  constructor(
    private licenseService: LicenseService,
    private spaceService: SpaceService,
    private licenseEngineService: LicensingCredentialBasedService,
    private roleSetLicenseService: RoleSetLicenseService,
    private collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    spaceID: string,
    rootSpaceCredentials?: ICredential[]
  ): Promise<ILicense[]> {
    // Space extends Actor - credentials are on the space directly
    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        credentials: true,
        subspaces: true,
        license: {
          entitlements: true,
        },
        community: {
          roleSet: true,
        },
        collaboration: true,
      },
    });
    if (
      !space.subspaces ||
      !space.credentials ||
      !space.license ||
      !space.license.entitlements ||
      !space.community ||
      !space.community.roleSet ||
      !space.collaboration
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of license reset: ${space.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    space.license = this.licenseService.reset(space.license);
    const credentials = rootSpaceCredentials ?? space.credentials;

    space.license = await this.extendLicensePolicy(space.license, credentials);

    updatedLicenses.push(space.license);

    if (!space.license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load license entitlements on Space: ${space.id} `,
        LogContext.ACCOUNT
      );
    }
    const roleSetLicenses = await this.roleSetLicenseService.applyLicensePolicy(
      space.community.roleSet.id,
      space.license.entitlements
    );
    updatedLicenses.push(...roleSetLicenses);

    const collaborationLicenses =
      await this.collaborationLicenseService.applyLicensePolicy(
        space.collaboration.id,
        space.license
      );
    updatedLicenses.push(...collaborationLicenses);

    for (const subspace of space.subspaces) {
      const subspaceLicenses = await this.applyLicensePolicy(
        subspace.id,
        credentials
      );
      updatedLicenses.push(...subspaceLicenses);
    }

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    credentials: ICredential[]
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        'License with entitlements not found for Space',
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FREE:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FREE,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PLUS:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PLUS,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PREMIUM:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PREMIUM,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
              credentials
            )
          ) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER:
          if (
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
              credentials
            )
          ) {
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
