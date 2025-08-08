import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccount } from '../account/account.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { Account } from '../account/account.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AccountType } from '@common/enums/account.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { DEFAULT_BASELINE_LICENSE_PLAN } from '../account/constants';

@Injectable()
export class AccountHostService {
  constructor(
    private agentService: AgentService,
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
    account.type = accountType;
    account.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ACCOUNT
    );
    account.baselineLicensePlan = this.getBaselineAccountLicensePlan();
    account.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ACCOUNT
      );

    account.agent = await this.agentService.createAgent({
      type: AgentType.ACCOUNT,
    });

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

    return await this.accountRepository.save(account);
  }

  private getBaselineAccountLicensePlan(): IAccountLicensePlan {
    return DEFAULT_BASELINE_LICENSE_PLAN;
  }

  public async assignLicensePlansToSpace(
    spaceAgent: IAgent,
    spaceID: string,
    type: AccountType,
    licensePlanID?: string
  ): Promise<IAgent> {
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
      await this.licenseIssuerService.assignLicensePlan(
        spaceAgent,
        licensePlan,
        spaceID
      );
    }
    return await this.agentService.getAgentOrFail(spaceAgent.id);
  }
}
