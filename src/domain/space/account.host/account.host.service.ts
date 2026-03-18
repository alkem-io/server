import { AccountType } from '@common/enums/account.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { ProfileType } from '@common/enums/profile.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { LicenseService } from '@domain/common/license/license.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IAccountLicensePlan } from '@domain/space/account.license.plan';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, Repository } from 'typeorm';
import { Account } from '../account/account.entity';
import { IAccount } from '../account/account.interface';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';

@Injectable()
export class AccountHostService {
  constructor(
    private licenseIssuerService: LicenseIssuerService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    private profileService: ProfileService,
    private storageAggregatorService: StorageAggregatorService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAccount(
    accountType: AccountType,
    txnMgr?: EntityManager
  ): Promise<IAccount> {
    // All DB writes happen inside a single transaction to prevent orphans.
    // When called within an outer transaction (txnMgr), reuse it;
    // otherwise create a standalone transaction.
    const doCreate = async (mgr: EntityManager): Promise<IAccount> => {
      const account: IAccount = new Account();
      account.accountType = accountType;
      // Actor type is set by Account constructor to ActorType.ACCOUNT
      // Generate a unique nameID for the account using first 8 chars of a UUID
      account.nameID = `account-${randomUUID().substring(0, 8)}`;
      account.authorization = new AuthorizationPolicy(
        AuthorizationPolicyType.ACCOUNT
      );
      account.baselineLicensePlan = this.getBaselineAccountLicensePlan();
      account.storageAggregator =
        await this.storageAggregatorService.createStorageAggregator(
          StorageAggregatorType.ACCOUNT,
          undefined,
          mgr
        );

      // Create a minimal profile for the Account actor
      account.profile = await this.profileService.createProfile(
        { displayName: account.nameID },
        ProfileType.ACCOUNT,
        account.storageAggregator
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
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
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

      // CTI handles multi-table saves automatically, just save children that need pre-saving
      account.license = await mgr.save(account.license);
      return await mgr.save(account);
    };

    if (txnMgr) {
      return await doCreate(txnMgr);
    }
    return await this.accountRepository.manager.transaction(doCreate);
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
