import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccountLicensePlan } from './account.license.plan.interface';
import { UpdateAccountLicensePlanInput } from './dto/account.license.plan.dto.update';

@Injectable()
export class AccountLicensePlanService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateLicensePlan(
    licensePlan: IAccountLicensePlan,
    updateData: UpdateAccountLicensePlanInput
  ): IAccountLicensePlan {
    if (updateData.spaceFree !== undefined) {
      licensePlan.spaceFree = updateData.spaceFree;
    }
    if (updateData.spacePlus !== undefined) {
      licensePlan.spacePlus = updateData.spacePlus;
    }
    if (updateData.spacePremium !== undefined) {
      licensePlan.spacePremium = updateData.spacePremium;
    }
    if (updateData.virtualContributor !== undefined) {
      licensePlan.virtualContributor = updateData.virtualContributor;
    }
    if (updateData.innovationPacks !== undefined) {
      licensePlan.innovationPacks = updateData.innovationPacks;
    }
    if (updateData.startingPages !== undefined) {
      licensePlan.startingPages = updateData.startingPages;
    }

    return licensePlan;
  }
}
