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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceService } from './space.service';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';

@Injectable()
export class SpaceLicenseService {
  constructor(
    private licenseService: LicenseService,
    private spaceService: SpaceService,
    private licenseEngineService: LicenseEngineService,
    private roleSetLicenseService: RoleSetLicenseService,
    private collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    spaceID: string,
    level0SpaceAgent?: IAgent
  ): Promise<ILicense[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        agent: {
          credentials: true,
        },
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
      !space.agent ||
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
    const rootLevelSpaceAgent = level0SpaceAgent ?? space.agent;

    space.license = await this.extendLicensePolicy(
      space.license,
      rootLevelSpaceAgent
    );

    updatedLicenses.push(space.license);

    const roleSetLicenses = await this.roleSetLicenseService.applyLicensePolicy(
      space.community.roleSet.id,
      space.license
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
        rootLevelSpaceAgent
      );
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
        case LicenseEntitlementType.SPACE_FREE:
          const spaceFree =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FREE,
              levelZeroSpaceAgent
            );
          if (spaceFree) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PLUS:
          const spacePlus =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PLUS,
              levelZeroSpaceAgent
            );
          if (spacePlus) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PREMIUM:
          const spacePremium =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PREMIUM,
              levelZeroSpaceAgent
            );
          if (spacePremium) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
          const saveAsTemplate =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
              levelZeroSpaceAgent
            );
          if (saveAsTemplate) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS:
          const createVirtualContributor =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
              levelZeroSpaceAgent
            );
          if (createVirtualContributor) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER:
          const createInnovationHub =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
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
