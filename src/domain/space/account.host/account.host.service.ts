import { AuthorizationCredential, LogContext } from '@common/enums';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccount } from '../account/account.interface';
import {
  AccountException,
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { LicenseIssuerService } from '@platform/license-issuer/license.issuer.service';
import { Account } from '../account/account.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { LicensingService } from '@platform/licensing/licensing.service';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ISpace } from '../space/space.interface';

@Injectable()
export class AccountHostService {
  constructor(
    private agentService: AgentService,
    private licenseIssuerService: LicenseIssuerService,
    private licensingService: LicensingService,
    private storageAggregatorService: StorageAggregatorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAccount(): Promise<IAccount> {
    const account: IAccount = new Account();
    account.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ACCOUNT
    );
    account.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ACCOUNT
      );

    account.agent = await this.agentService.createAgent({
      type: AgentType.ACCOUNT,
    });

    return await this.accountRepository.save(account);
  }

  async getAccountOrFail(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | never> {
    const account = await this.getAccount(accountID, options);
    if (!account)
      throw new EntityNotFoundException(
        `Unable to find Account with ID: ${accountID}`,
        LogContext.ACCOUNT
      );
    return account;
  }

  async getAccount(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | null> {
    return await this.accountRepository.findOne({
      where: { id: accountID },
      ...options,
    });
  }

  public async assignLicensePlansToSpace(
    space: ISpace,
    host: IContributor
  ): Promise<void> {
    if (!space.agent) {
      throw new RelationshipNotFoundException(
        `Space ${space.id} has no agent`,
        LogContext.ACCOUNT
      );
    }
    const licensingFramework =
      await this.licensingService.getDefaultLicensingOrFail();
    const licensePlansToAssign: ILicensePlan[] = [];
    const licensePlans = await this.licensingService.getLicensePlans(
      licensingFramework.id
    );
    for (const plan of licensePlans) {
      if (host instanceof User && plan.assignToNewUserAccounts) {
        licensePlansToAssign.push(plan);
      } else if (
        host instanceof Organization &&
        plan.assignToNewOrganizationAccounts
      ) {
        licensePlansToAssign.push(plan);
      }
    }

    const spaceAgent = space.agent;
    for (const licensePlan of licensePlansToAssign) {
      space.agent = await this.licenseIssuerService.assignLicensePlan(
        spaceAgent,
        licensePlan,
        space.id
      );
    }
  }

  public async getHost(account: IAccount): Promise<IContributor | null> {
    const user = await this.entityManager.findOne(User, {
      where: {
        accountID: account.id,
      },
    });
    if (user) {
      return user;
    }
    const organization = await this.entityManager.findOne(Organization, {
      where: {
        accountID: account.id,
      },
    });
    if (organization) {
      return organization;
    }

    throw new RelationshipNotFoundException(
      `Unable to find contributor associated with account ${account.id}`,
      LogContext.ACCOUNT
    );
  }

  public async areResourcesInAccount(accountID: string): Promise<boolean> {
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        spaces: true,
        virtualContributors: true,
        innovationPacks: true,
        innovationHubs: true,
      },
    });
    if (
      account.spaces.length > 0 ||
      account.virtualContributors.length > 0 ||
      account.innovationPacks.length > 0 ||
      account.innovationHubs.length > 0
    ) {
      return true;
    }

    return false;
  }

  public async getHostCredentials(
    account: IAccount
  ): Promise<ICredentialDefinition[]> {
    const accountHost = await this.getHostOrFail(account);
    const accountHostCredentials: ICredentialDefinition[] = [];
    if (accountHost instanceof User) {
      const userCriteria: ICredentialDefinition = {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: accountHost.id,
      };
      accountHostCredentials.push(userCriteria);
    } else if (accountHost instanceof Organization) {
      const organizationCriteriaAdmin: ICredentialDefinition = {
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: accountHost.id,
      };
      const organizationCriteriaOwner: ICredentialDefinition = {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: accountHost.id,
      };
      accountHostCredentials.push(organizationCriteriaAdmin);
      accountHostCredentials.push(organizationCriteriaOwner);
    } else {
      throw new AccountException(
        `Unable to determine host type for: ${account.id}, of type '${accountHost.constructor.name}'`,
        LogContext.ACCOUNT
      );
    }

    return accountHostCredentials;
  }

  public async getHostOrFail(account: IAccount): Promise<IContributor> {
    const host = await this.getHost(account);
    if (!host)
      throw new EntityNotFoundException(
        `Unable to find Host for account with ID: ${account.id}`,
        LogContext.COMMUNITY
      );
    return host;
  }
}
