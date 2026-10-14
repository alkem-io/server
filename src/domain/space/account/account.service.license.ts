import { LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { Inject, Injectable } from '@nestjs/common';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { SpaceLicenseService } from '../space/space.service.license';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';

@Injectable()
export class AccountLicenseService {
  constructor(
    private licenseService: LicenseService,
    private accountService: AccountService,
    private actorService: ActorService,
    private spaceLicenseService: SpaceLicenseService,
    private licensingCredentialBasedService: LicensingCredentialBasedService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  async applyLicensePolicy(accountID: string): Promise<ILicense[]> {
    const account = await this.accountService.getAccountOrFail(accountID, {
      relations: {
        credentials: true,
        spaces: true,
        license: {
          entitlements: true,
        },
      },
    });
    if (
      !account.spaces ||
      !account.credentials ||
      !account.license ||
      !account.license.entitlements ||
      !account.baselineLicensePlan
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of license reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    account.license = this.licenseService.reset(account.license);
    // Apply baseline license plan entitlements
    account.license = await this.applyBaselineLicensePlan(
      account.license,
      account
    );
    // extend the policy with the entitlements from credentials of the account (Account IS the Actor)
    account.license = await this.addEntitlementsFromCredentials(
      account.license,
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

  /**
   * Adds (sums) entitlements to the license, based on the credentials of the account agent.
   * @throws {EntityNotInitializedException} if the license entitlements are not initialized
   */
  private async addEntitlementsFromCredentials(
    license: ILicense | undefined,
    accountAgent: IActor
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        'License with entitlements not found for account with agent',
        LogContext.LICENSE,
        { accountAgentID: accountAgent.id }
      );
    }

    // Adds any credential based licensing based on the Actor held credentials
    for (const entitlement of license.entitlements) {
      await this.checkAndAssignGrantedEntitlement(entitlement, accountAgent);
    }

    return license;
  }

  private async checkAndAssignGrantedEntitlement(
    entitlement: ILicenseEntitlement,
    accountAgent: IActor
  ): Promise<void> {
    const grantedEntitlement =
      await this.licensingCredentialBasedService.getEntitlementIfGranted(
        entitlement.type,
        accountAgent
      );
    if (grantedEntitlement) {
      entitlement.limit += grantedEntitlement.limit;
      entitlement.enabled = entitlement.limit > 0;
    }
  }

  private async applyBaselineLicensePlan(
    license: ILicense | undefined,
    account: IAccount
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        `License with entitlements not found for account ${account.id}`,
        LogContext.LICENSE
      );
    }

    const baselinePlan = account.baselineLicensePlan;

    // Apply baseline entitlements to the license only if they are higher than current values
    for (const entitlement of license.entitlements) {
      let baselineValue: number;

      switch (entitlement.type) {
        case LicenseEntitlementType.ACCOUNT_SPACE_FREE:
          baselineValue = baselinePlan.spaceFree;
          break;
        case LicenseEntitlementType.ACCOUNT_SPACE_PLUS:
          baselineValue = baselinePlan.spacePlus;
          break;
        case LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM:
          baselineValue = baselinePlan.spacePremium;
          break;
        case LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR:
          baselineValue = baselinePlan.virtualContributor;
          break;
        case LicenseEntitlementType.ACCOUNT_INNOVATION_PACK:
          baselineValue = baselinePlan.innovationPacks;
          break;
        case LicenseEntitlementType.ACCOUNT_INNOVATION_HUB:
          baselineValue = baselinePlan.startingPages;
          break;
        default:
          // Keep default values for other entitlement types
          continue;
      }
      entitlement.limit = baselineValue;
      entitlement.enabled = baselineValue > 0;
    }
    return license;
  }
}
