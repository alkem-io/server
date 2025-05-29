import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateContentSpaceService } from './templateContentSpace.service';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';

@Injectable()
export class TemplateContentSpaceLicenseService {
  constructor(
    private licenseService: LicenseService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private licenseEngineService: LicensingCredentialBasedService,
    private roleSetLicenseService: RoleSetLicenseService,
    private collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    templateContentSpaceID: string,
    level0TemplateContentSpaceAgent?: IAgent
  ): Promise<ILicense[]> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceID,
        {
          relations: {
            agent: {
              credentials: true,
            },
            subtemplateContentSpaces: true,
            license: {
              entitlements: true,
            },
            community: {
              roleSet: true,
            },
            collaboration: true,
          },
        }
      );
    if (
      !templateContentSpace.subtemplateContentSpaces ||
      !templateContentSpace.agent ||
      !templateContentSpace.license ||
      !templateContentSpace.license.entitlements ||
      !templateContentSpace.community ||
      !templateContentSpace.community.roleSet ||
      !templateContentSpace.collaboration
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load TemplateContentSpace with entities at start of license reset: ${templateContentSpace.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    templateContentSpace.license = this.licenseService.reset(
      templateContentSpace.license
    );
    const rootLevelTemplateContentSpaceAgent =
      level0TemplateContentSpaceAgent ?? templateContentSpace.agent;

    templateContentSpace.license = await this.extendLicensePolicy(
      templateContentSpace.license,
      rootLevelTemplateContentSpaceAgent
    );

    updatedLicenses.push(templateContentSpace.license);

    if (!templateContentSpace.license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load license entitlements on Spac: ${templateContentSpace.id} `,
        LogContext.ACCOUNT
      );
    }
    const roleSetLicenses = await this.roleSetLicenseService.applyLicensePolicy(
      templateContentSpace.community.roleSet.id,
      templateContentSpace.license.entitlements
    );
    updatedLicenses.push(...roleSetLicenses);

    const collaborationLicenses =
      await this.collaborationLicenseService.applyLicensePolicy(
        templateContentSpace.collaboration.id,
        templateContentSpace.license
      );
    updatedLicenses.push(...collaborationLicenses);

    for (const subtemplateContentSpace of templateContentSpace.subtemplateContentSpaces) {
      const subtemplateContentSpaceLicenses = await this.applyLicensePolicy(
        subtemplateContentSpace.id,
        rootLevelTemplateContentSpaceAgent
      );
      updatedLicenses.push(...subtemplateContentSpaceLicenses);
    }

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    levelZeroTemplateContentSpaceAgent: IAgent
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        `License with entitlements not found for TemplateContentSpace with agent ${levelZeroTemplateContentSpaceAgent.id}`,
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FREE:
          const templateContentSpaceFree =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FREE,
              levelZeroTemplateContentSpaceAgent
            );
          if (templateContentSpaceFree) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PLUS:
          const templateContentSpacePlus =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PLUS,
              levelZeroTemplateContentSpaceAgent
            );
          if (templateContentSpacePlus) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_PREMIUM:
          const templateContentSpacePremium =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_PREMIUM,
              levelZeroTemplateContentSpaceAgent
            );
          if (templateContentSpacePremium) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
          const saveAsTemplate =
            await this.licenseEngineService.isEntitlementGranted(
              LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
              levelZeroTemplateContentSpaceAgent
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
              levelZeroTemplateContentSpaceAgent
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
              levelZeroTemplateContentSpaceAgent
            );
          if (createInnovationHub) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;

        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for TemplateContentSpace: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }
}
