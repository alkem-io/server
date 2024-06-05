import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AccountService } from '@domain/space/account/account.service';
import { LicenseNotFoundException } from '@common/exceptions/license.not.found.exception';
import { LicensingService } from '@platform/licensing/licensing.service';

@Injectable()
export class AdminLicensingService {
  constructor(
    private licensingService: LicensingService,
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlanToAccount(
    licensePlanData: AssignLicensePlanToAccount,
    licensingID: string
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingService.getLicensingOrFail(
      licensingID,
      {
        relations: {
          plans: true,
        },
      }
    );
    if (!licensing.plans) {
      throw new EntityNotInitializedException(
        `Licensing (${licensing}) not initialised`,
        LogContext.LICENSE
      );
    }

    const licensePlan = licensing.plans.find(
      plan => plan.id === licensePlanData.licensePlanID
    );
    if (!licensePlan) {
      throw new LicenseNotFoundException(
        `Licensing (${licensing}) does not contain the requested plan: ${licensePlanData.licensePlanID}`,
        LogContext.LICENSE
      );
    }

    // Todo: assign the actual credential for the license plan
    const account = await this.accountService.getAccountOrFail(
      licensePlanData.accountID
    );
    this.logger.verbose?.(
      `Assigning license plan ${licensePlan.id} to account ${account.id}`,
      LogContext.LICENSE
    );

    return licensePlan;
  }
}
