import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { LicenseService } from '@domain/common/license/license.service';
import { IAccountLicensePlan } from '@domain/space/account.license.plan';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { IAccount } from '../account/account.interface';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';

@Injectable()
export class AccountHostService {
  constructor(
    private licenseIssuerService: LicenseIssuerService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    private storageAggregatorService: StorageAggregatorService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAccount(accountType: AccountType): Promise<IAccount> {
    const account: IAccount = new Account();
    account.accountType = accountType;
    // Account extends Actor - set the actor type (credentials are managed through Actor)
    account.type = ActorType.ACCOUNT;
    // Generate a unique nameID for the account using first 8 chars of a UUID
    account.nameID = `account-${randomUUID().substring(0, 8)}`;
    account.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ACCOUNT
    );
    account.baselineLicensePlan = this.getBaselineAccountLicensePlan();
    account.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ACCOUNT
      );

    account.license = this.licenseService.createLicense({
      type: LicenseType.ACCOUNT,
      entitlements: [
        {
          type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
          dataType: LicenseEntitlementDataType.LIMIT,
          limit: 0,
          enabled: false,
        },
      ],
    });

    return await this.accountRepository.save(account);
  }

  private getBaselineAccountLicensePlan(): IAccountLicensePlan {
    return DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN;
  }

  /**
   * Assign license plans to a Space.
   * Space IS an Actor - credentials are granted directly to the Space using its ID as actorID.
   */
  public async assignLicensePlansToSpace(
    spaceId: string,
    type: AccountType,
    licensePlanID?: string
  ): Promise<void> {
    const licensingFramework =
      await this.licensingFrameworkService.getDefaultLicensingOrFail();
    const licensePlansToAssign: ILicensePlan[] = [];
    const licensePlans =
      await this.licensingFrameworkService.getLicensePlansOrFail(
        licensingFramework.id
      );
    for (const plan of licensePlans) {
      if (type === AccountType.USER && plan.assignToNewUserAccounts) {
        licensePlansToAssign.push(plan);
      } else if (
        type === AccountType.ORGANIZATION &&
        plan.assignToNewOrganizationAccounts
      ) {
        licensePlansToAssign.push(plan);
      }
    }
    if (licensePlanID) {
      const licensePlanAlreadyAssigned = licensePlansToAssign.find(
        plan => plan.id === licensePlanID
      );
      if (!licensePlanAlreadyAssigned) {
        const additionalPlan =
          await this.licensingFrameworkService.getLicensePlanOrFail(
            licensingFramework.id,
            licensePlanID
          );

        licensePlansToAssign.push(additionalPlan);
      }
    }

    for (const licensePlan of licensePlansToAssign) {
      // Space IS an Actor - grant credentials directly using spaceId as actorID
      await this.licenseIssuerService.assignLicensePlan(
        spaceId,
        licensePlan,
        spaceId
      );
    }
  }
}
