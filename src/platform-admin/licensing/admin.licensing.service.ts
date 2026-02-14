import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE, type DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';

@Injectable()
export class AdminLicensingService {
  constructor(
    private accountLookupService: AccountLookupService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseIssuerService: LicenseIssuerService,
    private spaceService: SpaceService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async assignLicensePlanToSpace(
    licensePlanData: AssignLicensePlanToSpace,
    licensingID: string
  ): Promise<ISpace> {
    const licensePlan =
      await this.licensingFrameworkService.getLicensePlanOrFail(
        licensingID,
        licensePlanData.licensePlanID
      );
    const isLicensePlanTypeForSpaces =
      licensePlan.type ===
        LicensingCredentialBasedPlanType.SPACE_FEATURE_FLAG ||
      licensePlan.type === LicensingCredentialBasedPlanType.SPACE_PLAN;
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
        with: {
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
    const licensePlan =
      await this.licensingFrameworkService.getLicensePlanOrFail(
        licensingID,
        licensePlanData.licensePlanID
      );
    const isLicensePlanTypeForSpaces =
      licensePlan.type ===
        LicensingCredentialBasedPlanType.SPACE_FEATURE_FLAG ||
      licensePlan.type === LicensingCredentialBasedPlanType.SPACE_PLAN;
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
        with: {
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
    const licensePlan =
      await this.licensingFrameworkService.getLicensePlanOrFail(
        licensingID,
        licensePlanData.licensePlanID
      );
    const isLicensePlanTypeForAccounts =
      licensePlan.type === LicensingCredentialBasedPlanType.ACCOUNT_PLAN ||
      licensePlan.type ===
        LicensingCredentialBasedPlanType.ACCOUNT_FEATURE_FLAG;
    if (!isLicensePlanTypeForAccounts) {
      throw new ValidationException(
        `License Plan is not for Accounts: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }
    // Todo: assign the actual credential for the license plan
    const account = await this.accountLookupService.getAccountOrFail(
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
    const licensePlan =
      await this.licensingFrameworkService.getLicensePlanOrFail(
        licensingID,
        licensePlanData.licensePlanID
      );
    const isLicensePlanTypeForAccounts =
      licensePlan.type === LicensingCredentialBasedPlanType.ACCOUNT_PLAN ||
      licensePlan.type ===
        LicensingCredentialBasedPlanType.ACCOUNT_FEATURE_FLAG;
    if (!isLicensePlanTypeForAccounts) {
      throw new ValidationException(
        `License Plan is not for Accounts: ${licensePlan.type}`,
        LogContext.LICENSE
      );
    }

    // Todo: assign the actual credential for the license plan
    const account = await this.accountLookupService.getAccountOrFail(
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

  public async getAllAccounts(): Promise<IAccount[]> {
    const results = await this.db.query.accounts.findMany({
      with: {
        license: true,
      },
    });
    return results as unknown as IAccount[];
  }
}
