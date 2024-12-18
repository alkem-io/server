import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { AccountService } from './account.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { IAccount } from './account.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceLicenseService } from '../space/space.service.license';
import { LicensingWingbackSubscriptionService } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.service';

@Injectable()
export class AccountLicenseService {
  constructor(
    private licenseService: LicenseService,
    private accountService: AccountService,
    private spaceLicenseService: SpaceLicenseService,
    private licensingCredentialBasedService: LicensingCredentialBasedService,
    private licensingWingbackSubscriptionService: LicensingWingbackSubscriptionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(accountID: string): Promise<ILicense[]> {
    const account = await this.accountService.getAccountOrFail(accountID, {
      relations: {
        agent: {
          credentials: true,
        },
        spaces: true,
        license: {
          entitlements: true,
        },
      },
    });
    if (
      !account.spaces ||
      !account.agent ||
      !account.license ||
      !account.license.entitlements
    ) {
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
      account.agent,
      account
    );

    updatedLicenses.push(account.license);

    for (const space of account.spaces) {
      const spaceLicenses = await this.spaceLicenseService.applyLicensePolicy(
        space.id
      );
      updatedLicenses.push(...spaceLicenses);
    }

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    accountAgent: IAgent,
    account: IAccount
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        `License with entitielements not found for account with agent ${accountAgent.id}`,
        LogContext.LICENSE
      );
    }
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.ACCOUNT_SPACE_FREE:
          const createSpaceEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              accountAgent
            );
          if (createSpaceEntitlement) {
            entitlement.limit = createSpaceEntitlement.limit;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.ACCOUNT_SPACE_PLUS:
          const createSpacePLusEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
              accountAgent
            );
          if (createSpacePLusEntitlement) {
            entitlement.limit = createSpacePLusEntitlement.limit;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM:
          const createSpacePremiumEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
              accountAgent
            );
          if (createSpacePremiumEntitlement) {
            entitlement.limit = createSpacePremiumEntitlement.limit;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR:
          const createVirtualContributorEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
              accountAgent
            );
          if (createVirtualContributorEntitlement) {
            entitlement.limit = createVirtualContributorEntitlement.limit;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.ACCOUNT_INNOVATION_HUB:
          const createInnovationHubEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
              accountAgent
            );
          if (createInnovationHubEntitlement) {
            entitlement.limit = createInnovationHubEntitlement.limit;
            entitlement.enabled = true;
          }
          break;
        case LicenseEntitlementType.ACCOUNT_INNOVATION_PACK:
          const createInnovationPackEntitlement =
            await this.licensingCredentialBasedService.getEntitlementIfGranted(
              LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
              accountAgent
            );
          if (createInnovationPackEntitlement) {
            entitlement.limit = createInnovationPackEntitlement.limit;
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

    if (account.externalSubscriptionID) {
      // TODO: get subscription details from the WingBack api + set the entitlements accordingly
      const wingbackLicenseEntitlements =
        await this.licensingWingbackSubscriptionService.getEntitlements(
          account.externalSubscriptionID
        );
      this.logger.verbose?.(
        `Invoking external subscription service for account ${account.id}, entitlements ${wingbackLicenseEntitlements}`,
        LogContext.ACCOUNT
      );
    }

    return license;
  }
}
