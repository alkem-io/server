import { LogContext } from '@common/enums';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { LicenseService } from '@domain/common/license/license.service';
import { accounts } from '@domain/space/account/account.schema';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WingbackManager } from '@services/external/wingback';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WingbackContractPayload } from './types';

@Injectable()
export class WingbackWebhookService {
  constructor(
    private readonly wingbackManager: WingbackManager,
    private readonly accountLicenseService: AccountLicenseService,
    private readonly licenseService: LicenseService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async contractChanged(
    payload: WingbackContractPayload
  ): Promise<void> {
    return this.resetAccountByWingbackContract(payload.id);
  }

  public async newContract(payload: WingbackContractPayload): Promise<void> {
    return this.resetAccountByWingbackContract(payload.id);
  }

  private async resetAccountByWingbackContract(
    contractId: string
  ): Promise<void> {
    // 1. query the contract by id
    // 2. from the above query get the costumer ID
    const {
      contract_summary: { customer_id: customerId },
    } = await this.wingbackManager.getContract(contractId);
    // 3. use the customer ID to get the account in Alkemio
    const account = await this.db.query.accounts.findFirst({
      where: eq(accounts.externalSubscriptionID, customerId),
      columns: { id: true },
    });

    if (!account) {
      this.logger.error(
        `Account not found for Wingback customer ID: ${customerId}`,
        undefined,
        LogContext.WINGBACK_HOOKS
      );
      return;
    }
    // 4. since the contract query returns all the features we can either pass the features to the reset,
    // or let the reset query the contract again
    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);
  }
}
