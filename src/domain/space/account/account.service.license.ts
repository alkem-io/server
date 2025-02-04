import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { AccountService } from './account.service';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { IAccount } from './account.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceLicenseService } from '../space/space.service.license';
import { LicensingWingbackSubscriptionService } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.service';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';

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
    const name = user?.name ?? organization?.name;
    const mainEmail = user?.email ?? organization?.email;

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

    return wingbackCustomerID;
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

    // First check the credential based licensing based on the Agent held credentials
    for (const entitlement of license.entitlements) {
      await this.checkAndAssignGrantedEntitlement(entitlement, accountAgent);
    }

    // Then check the Wingback subscription service for any granted entitlements
    if (account.externalSubscriptionID) {
      const wingbackGrantedLicenseEntitlements: LicensingGrantedEntitlement[] =
        [];

      try {
        const result =
          await this.licensingWingbackSubscriptionService.getEntitlements(
            account.externalSubscriptionID
          );
        wingbackGrantedLicenseEntitlements.push(...result);
      } catch (e: any) {
        this.logger.warn?.(
          `Skipping Wingback entitlements for account ${account.id} since it returned with an error: ${e}`,
          LogContext.ACCOUNT
        );
      }

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
    }

    return license;
  }

  private async checkAndAssignGrantedEntitlement(
    entitlement: ILicenseEntitlement,
    accountAgent: IAgent
  ): Promise<void> {
    const grantedEntitlement =
      await this.licensingCredentialBasedService.getEntitlementIfGranted(
        entitlement.type,
        accountAgent
      );
    if (grantedEntitlement) {
      entitlement.limit = grantedEntitlement.limit;
      entitlement.enabled = true;
    }
  }
}
