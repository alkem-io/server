import { Inject, Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { AccountService } from './account.service';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { IAccount } from './account.interface';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { SpaceLicenseService } from '../space/space.service.license';
import { LicensingWingbackSubscriptionService } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.service';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ActorService } from '@domain/actor/actor/actor.service';

@Injectable()
export class AccountLicenseService {
  constructor(
    private licenseService: LicenseService,
    private accountService: AccountService,
    private actorService: ActorService,
    private spaceLicenseService: SpaceLicenseService,
    private licensingCredentialBasedService: LicensingCredentialBasedService,
    private licensingWingbackSubscriptionService: LicensingWingbackSubscriptionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  async applyLicensePolicy(accountID: string): Promise<ILicense[]> {
    // Account now extends Actor, so credentials are on the account directly
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
    // extend the policy with the entitlements from account credentials (Account extends Actor)
    account.license = await this.addEntitlementsFromCredentials(
      account.license,
      account.id,
      account.credentials
    );
    // Apply Wingback entitlements with the highest priority
    account.license = await this.applyWingbackEntitlements(
      account,
      account.license
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
   * Creates a Wingback account for the given Alkemio account AND assigns ACCOUNT_LICENSE_PLUS
   * @param accountID
   */
  public async createWingbackAccount(accountID: string) {
    const accountDetails =
      await this.accountService.getAccountAndDetails(accountID);

    if (!accountDetails) {
      throw new EntityNotFoundException(
        'Account not found',
        LogContext.ACCOUNT,
        { accountID }
      );
    }

    if (accountDetails.externalSubscriptionID) {
      throw new BaseExceptionInternal(
        'Account already has an external subscription',
        LogContext.LICENSE
      );
    }

    const { user, organization } = accountDetails;
    const name =
      user?.name ?? (organization?.legalName || organization?.displayName);
    const mainEmail =
      user?.email ??
      (organization?.email ||
        `dummy-${organization?.nameID}@${organization?.nameID}.com`);

    const { id: wingbackCustomerID } =
      await this.licensingWingbackSubscriptionService.createCustomer({
        name,
        emails: { main: mainEmail },
      });
    // associate the Alkemio account with the Wingback customer
    await this.accountService.updateExternalSubscriptionId(
      accountID,
      wingbackCustomerID
    );
    // grant ACCOUNT_LICENSE_PLUS entitlement to the account (Account extends Actor)
    const accountActor = await this.accountService.getActorOrFail(accountID);
    try {
      await this.actorService.grantCredentialOrFail(accountActor.actorId, {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: accountID,
      });
      // only populate the license entitlements if the credential was granted successfully
      await this.applyLicensePolicy(accountID);
    } catch {
      // failing is perfectly fine; we have to make sure the credential is granted
      this.logger.verbose?.(
        {
          message: 'Account already has ACCOUNT_LICENSE_PLUS credential',
          accountId: accountID,
          actorId: accountActor.actorId,
        },
        LogContext.ACCOUNT
      );
    }

    return wingbackCustomerID;
  }

  /**
   * Adds (sums) entitlements to the license, based on the credentials of the account.
   * Account now extends Actor, so credentials are on the account directly.
   * @throws {EntityNotInitializedException} if the license entitlements are not initialized
   */
  private async addEntitlementsFromCredentials(
    license: ILicense | undefined,
    accountId: string,
    credentials: ICredential[]
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        'License with entitlements not found for account',
        LogContext.LICENSE,
        { accountId }
      );
    }

    // Adds any credential based licensing based on the account's credentials
    for (const entitlement of license.entitlements) {
      await this.checkAndAssignGrantedEntitlement(entitlement, credentials);
    }

    return license;
  }

  /**
   * @throws {EntityNotInitializedException} if the license entitlements are not initialized
   */
  private async applyWingbackEntitlements(
    account: IAccount,
    license: ILicense
  ) {
    if (!this.licensingWingbackSubscriptionService.isEnabled()) {
      return license;
    }

    if (!account.externalSubscriptionID) {
      return license;
    }

    if (!license.entitlements) {
      this.logger.error(
        {
          message: 'Entitlements not initialized for License entity',
          accountId: account.id,
          licenseId: license.id,
        },
        undefined,
        LogContext.ACCOUNT
      );
      return license;
    }

    // Then check the Wingback subscription service for any granted entitlements
    const wingbackGrantedLicenseEntitlements: LicensingGrantedEntitlement[] =
      [];

    try {
      const result =
        await this.licensingWingbackSubscriptionService.getEntitlements(
          account.externalSubscriptionID
        );
      wingbackGrantedLicenseEntitlements.push(...result);
    } catch (e: any) {
      this.logger.error?.(
        {
          message:
            'Skipping Wingback entitlements for Account, since it returned with an error',
          accountId: account.id,
          error: e,
        },
        e?.stack,
        LogContext.ACCOUNT
      );
      return license;
    }
    // early exit if no wingback entitlements were found`
    if (!wingbackGrantedLicenseEntitlements.length) {
      this.logger.warn?.(
        {
          message: 'No Wingback granted entitlements found for Account',
          accountId: account.id,
          wingbackCustomerId: account.externalSubscriptionID,
        },
        LogContext.ACCOUNT
      );
      return license;
    }
    // apply any wingback granted entitlements to the existing entitlements license
    for (const entitlement of license.entitlements) {
      const wingbackGrantedEntitlement =
        wingbackGrantedLicenseEntitlements.find(
          e => e.type === entitlement.type
        );
      if (wingbackGrantedEntitlement) {
        entitlement.limit = wingbackGrantedEntitlement.limit;
        entitlement.enabled = true;
      }
    }

    return license;
  }

  private async checkAndAssignGrantedEntitlement(
    entitlement: ILicenseEntitlement,
    credentials: ICredential[]
  ): Promise<void> {
    const grantedEntitlement =
      await this.licensingCredentialBasedService.getEntitlementIfGranted(
        entitlement.type,
        credentials
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
