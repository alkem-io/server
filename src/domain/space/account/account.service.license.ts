import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { AccountService } from './account.service';
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

@Injectable()
export class AccountLicenseService {
  constructor(
    private licenseService: LicenseService,
    private accountService: AccountService,
    private licenseEngineService: LicenseEngineService
  ) {}

  async applyLicensePolicy(accountID: string): Promise<ILicense[]> {
    const account = await this.accountService.getAccountOrFail(accountID, {
      relations: {
        agent: {
          credentials: true,
        },
        spaces: true,
        license: true,
      },
    });
    if (!account.spaces || !account.agent || !account.license) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of license reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    account.license = this.licenseService.reset(account.license);

    account.license = await this.extendLicensePolicy(
      account.license,
      account.agent
    );

    updatedLicenses.push(account.license);

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    accountAgent: IAgent
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        `License with entitielements not found for account with agent ${accountAgent.id}`,
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE:
          const createSpace = await this.licenseEngineService.isAccessGranted(
            LicensePrivilege.ACCOUNT_CREATE_SPACE,
            accountAgent
          );
          if (createSpace) {
            entitlement.limit = 3;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.VIRTUAL_CONTRIBUTOR:
          const createVirtualContributor =
            await this.licenseEngineService.isAccessGranted(
              LicensePrivilege.ACCOUNT_CREATE_VIRTUAL_CONTRIBUTOR,
              accountAgent
            );
          if (createVirtualContributor) {
            entitlement.limit = 3;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.INNOVATION_HUB:
          const createInnovationHub =
            await this.licenseEngineService.isAccessGranted(
              LicensePrivilege.ACCOUNT_CREATE_INNOVATION_HUB,
              accountAgent
            );
          if (createInnovationHub) {
            entitlement.limit = 1;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.INNOVATION_PACK:
          const createInnovationPack =
            await this.licenseEngineService.isAccessGranted(
              LicensePrivilege.ACCOUNT_CREATE_INNOVATION_PACK,
              accountAgent
            );
          if (createInnovationPack) {
            entitlement.limit = 3;
            entitlement.enabled = true;
          }
          break;
        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for license: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }
}
