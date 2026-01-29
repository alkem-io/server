import { LogContext } from '@common/enums';
import { LicenseService } from '@domain/common/license/license.service';
import { Account } from '@domain/space/account/account.entity';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WingbackManager } from '@services/external/wingback';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { WingbackContractPayload } from './types';

@Injectable()
export class WingbackWebhookService {
  constructor(
    private readonly wingbackManager: WingbackManager,
    private readonly accountLicenseService: AccountLicenseService,
    private readonly licenseService: LicenseService,
    @InjectEntityManager() private entityManager: EntityManager,
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
    const account = await this.entityManager.findOne(Account, {
      loadEagerRelations: false,
      where: { externalSubscriptionID: customerId },
      select: { id: true },
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
