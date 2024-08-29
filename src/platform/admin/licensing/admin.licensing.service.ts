import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { LicensingService } from '@platform/licensing/licensing.service';
import { LicenseIssuerService } from '@platform/license-issuer/license.issuer.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';
import { SpaceService } from '@domain/space/space/space.service';
import { ISpace } from '@domain/space/space/space.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { IAccount } from '@domain/space/account/account.interface';
import { LicensePlanType } from '@common/enums/license.plan.type';
import { ValidationException } from '@common/exceptions';

@Injectable()
export class AdminLicensingService {
  constructor(
    private accountHostService: AccountHostService,
    private licensingService: LicensingService,
    private licenseIssuerService: LicenseIssuerService,
    private spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlanToSpace(
    licensePlanData: AssignLicensePlanToSpace,
    licensingID: string
  ): Promise<ISpace> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );
    const isLicensePlanTypeForSpaces =
      licensePlan.type === LicensePlanType.SPACE_FEATURE_FLAG ||
      licensePlan.type === LicensePlanType.SPACE_PLAN;
    if (!isLicensePlanTypeForSpaces) {
      throw new ValidationException(
        `License Plan is not for Spaces: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }

    // Todo: assign the actual credential for the license plan
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!space.agent) {
      throw new EntityNotInitializedException(
        `Space (${space}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    space.agent = await this.licenseIssuerService.assignLicensePlan(
      space.agent,
      licensePlan,
      space.id
    );

    return space;
  }

  public async revokeLicensePlanFromSpace(
    licensePlanData: RevokeLicensePlanFromSpace,
    licensingID: string
  ): Promise<ISpace> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );
    const isLicensePlanTypeForSpaces =
      licensePlan.type === LicensePlanType.SPACE_FEATURE_FLAG ||
      licensePlan.type === LicensePlanType.SPACE_PLAN;
    if (!isLicensePlanTypeForSpaces) {
      throw new ValidationException(
        `License Plan is not for Spaces: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }

    // Todo: assign the actual credential for the license plan
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID,
      {
        relations: {
          agent: true,
        },
      }
    );
    if (!space.agent) {
      throw new EntityNotInitializedException(
        `Account (${space}) does not have an agent`,
        LogContext.LICENSE
      );
    }
    space.agent = await this.licenseIssuerService.revokeLicensePlan(
      space.agent,
      licensePlan,
      space.id
    );

    return space;
  }

  public async assignLicensePlanToAccount(
    licensePlanData: AssignLicensePlanToAccount,
    licensingID: string
  ): Promise<IAccount> {
    const licensePlan = await this.licensingService.getLicensePlanOrFail(
      licensingID,
      licensePlanData.licensePlanID
    );
    const isLicensePlanTypeForAccounts =
      licensePlan.type === LicensePlanType.ACCOUNT_PLAN ||
      licensePlan.type === LicensePlanType.ACCOUNT_FEATURE_FLAG;
    if (!isLicensePlanTypeForAccounts) {
      throw new ValidationException(
        `License Plan is not for Accounts: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }
    // Todo: assign the actual credential for the license plan
    const account = await this.accountHostService.getAccountOrFail(
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
    const isLicensePlanTypeForAccounts =
      licensePlan.type === LicensePlanType.ACCOUNT_PLAN ||
      licensePlan.type === LicensePlanType.ACCOUNT_FEATURE_FLAG;
    if (!isLicensePlanTypeForAccounts) {
      throw new ValidationException(
        `License Plan is not for Accounts: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }

    // Todo: assign the actual credential for the license plan
    const account = await this.accountHostService.getAccountOrFail(
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
