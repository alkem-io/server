import { LogContext } from '@common/enums/logging.context';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';
import { SpaceService } from '@domain/space/space/space.service';
import { ISpace } from '@domain/space/space/space.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { IAccount } from '@domain/space/account/account.interface';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { ValidationException } from '@common/exceptions';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';

@Injectable()
export class AdminLicensingService {
  constructor(
    private accountLookupService: AccountLookupService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseIssuerService: LicenseIssuerService,
    private spaceService: SpaceService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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

    // Space IS an Actor - assign license plan directly using space.id as actorId
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID
    );
    await this.licenseIssuerService.assignLicensePlan(
      space.id,
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

    // Space IS an Actor - revoke license plan directly using space.id as actorId
    const space = await this.spaceService.getSpaceOrFail(
      licensePlanData.spaceID
    );
    await this.licenseIssuerService.revokeLicensePlan(
      space.id,
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

    // Account IS an Actor - assign license plan directly using account.id as actorId
    const account = await this.accountLookupService.getAccountOrFail(
      licensePlanData.accountID
    );
    await this.licenseIssuerService.assignLicensePlan(
      account.id,
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

    // Account IS an Actor - revoke license plan directly using account.id as actorId
    const account = await this.accountLookupService.getAccountOrFail(
      licensePlanData.accountID
    );
    await this.licenseIssuerService.revokeLicensePlan(
      account.id,
      licensePlan,
      account.id
    );

    return account;
  }

  public async getAllAccounts(): Promise<IAccount[]> {
    return this.entityManager.find(IAccount, {
      relations: {
        license: true,
      },
    });
  }
}
