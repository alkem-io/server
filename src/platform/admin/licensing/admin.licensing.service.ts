import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AccountService } from '@domain/space/account/account.service';
import { LicensingService } from '@platform/licensing/licensing.service';
import { LicenseIssuerService } from '@platform/license-issuer/license.issuer.service';
import { IAccount } from '@domain/space/account/account.interface';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';

@Injectable()
export class AdminLicensingService {
  constructor(
    private licensingService: LicensingService,
    private licenseIssuerService: LicenseIssuerService,
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlanToAccount(
    licensePlanData: AssignLicensePlanToAccount,
    licensingID: string
  ): Promise<IAccount> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );

    // Todo: assign the actual credential for the license plan
    const account = await this.accountService.getAccountOrFail(
      licensePlanData.accountID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!account.agent) {
      throw new EntityNotInitializedException(
        `Account (${account}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    account.agent = await this.licenseIssuerService.assignLicensePlan(
      account.agent,
      licensePlan,
      account.id
    );

    return account;
  }

  public async revokeLicensePlanFromAccount(
    licensePlanData: RevokeLicensePlanFromAccount,
    licensingID: string
  ): Promise<IAccount> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );

    // Todo: assign the actual credential for the license plan
    const account = await this.accountService.getAccountOrFail(
      licensePlanData.accountID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!account.agent) {
      throw new EntityNotInitializedException(
        `Account (${account}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    account.agent = await this.licenseIssuerService.revokeLicensePlan(
      account.agent,
      licensePlan,
      account.id
    );

    return account;
  }
}
