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
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { AgentService } from '@domain/agent/agent/agent.service';

@Injectable()
export class AccountLicenseService {
  constructor(
    private licenseService: LicenseService,
    private accountService: AccountService,
    private agentService: AgentService,
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
    // grant ACCOUNT_LICENSE_PLUS entitlement to the account agent
    const accountAgent = await this.accountService.getAgentOrFail(accountID);
    try {
      await this.agentService.grantCredentialOrFail({
        agentID: accountAgent.id,
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
          agentId: accountAgent.id,
        },
        LogContext.ACCOUNT
      );
    }

    return wingbackCustomerID;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    accountAgent: IAgent,
    account: IAccount
  ): Promise<ILicense> {
    if (!license || !license.entitlements) {
      throw new EntityNotInitializedException(
        'License with entitlements not found for account with agent',
        LogContext.LICENSE,
        { accountAgentID: accountAgent.id }
      );
    }

    // First check the credential based licensing based on the Agent held credentials
    // This sets the defaults, granted by the credentials
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
