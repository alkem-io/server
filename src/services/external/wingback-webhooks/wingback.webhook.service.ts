import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WingbackContractPayload } from './types';
import { WingbackManager } from '@services/external/wingback';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Account } from '@domain/space/account/account.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';

@Injectable()
export class WingbackWebhookService {
  constructor(
    private readonly wingbackManager: WingbackManager,
    private readonly accountAuthorizationService: AccountAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly accountLicenseService: AccountLicenseService,
    private readonly licenseService: LicenseService,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async contractChanged(
    payload: WingbackContractPayload
  ): Promise<void> {
    console.log(
      'Wingback "v1.contract.change.completed" event handled',
      payload
    );
    // 1. query the contract by id
    // 2. from the above query get the costumer ID
    const {
      contract_summary: { customer_id: customerId },
    } = await this.wingbackManager.getContract(payload.id);
    // 3. use the customer ID to get the account in Alkemio
    const account = await this.entityManager.findOne(Account, {
      loadEagerRelations: false,
      where: { externalSubscriptionID: customerId },
      select: { id: true },
    });

    if (!account) {
      this.logger.error(`Account not found for customer ID: ${customerId}`);
      return;
    }
    // 4. since the contract query returns all the features we can either pass the features to the reset,
    // or let the reset query the contract again
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(accountAuthorizations);
    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);
  }

  public async newContract(payload: WingbackContractPayload): Promise<void> {
    console.log(
      'Wingback "v1.contract.signature.completed" event handled',
      payload
    );
    // steps are the same as contractChanged
    await this.contractChanged(payload);
  }
}
