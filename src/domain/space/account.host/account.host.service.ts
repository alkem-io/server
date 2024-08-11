import { AuthorizationCredential, LogContext } from '@common/enums';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
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
import { CreateAccountInput } from '../account/dto/account.dto.create';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { LicensingService } from '@platform/licensing/licensing.service';
import { Credential } from '@domain/agent/credential/credential.entity';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';

@Injectable()
export class AccountHostService {
  constructor(
    private contributorService: ContributorService,
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

  async createAccount(accountData: CreateAccountInput): Promise<IAccount> {
    let account: IAccount = new Account();
    account.authorization = new AuthorizationPolicy();
    account.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ACCOUNT
      );

    account.agent = await this.agentService.createAgent({
      type: AgentType.ACCOUNT,
    });

    account = await this.accountRepository.save(account);

    await this.setAccountHost(account, accountData.host);
    await this.assignLicensePlansToAccount(account, accountData.host);

    return account;
  }

  private async assignLicensePlansToAccount(
    account: IAccount,
    host: IContributor
  ): Promise<void> {
    if (!account.agent) {
      throw new RelationshipNotFoundException(
        `Account ${account.id} has no agent`,
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

    const accountAgent = account.agent;
    for (const licensePlan of licensePlansToAssign) {
      account.agent = await this.licenseIssuerService.assignLicensePlan(
        accountAgent,
        licensePlan,
        account.id
      );
    }
  }

  public async getHost(account: IAccount): Promise<IContributor | null> {
    const contributors =
      await this.contributorService.contributorsWithCredentials({
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    if (contributors.length === 1) {
      return contributors[0];
    } else if (contributors.length > 1) {
      this.logger.error(
        `Account with ID: ${account.id} has multiple hosts. This should not happen.`,
        LogContext.ACCOUNT
      );
    }

    return null;
  }

  public async areResourcesInAccount(
    contributor: IContributor
  ): Promise<boolean> {
    const hostedAccounts =
      await this.getAccountsHostedByContributor(contributor);
    for (const hostedAccount of hostedAccounts) {
      const account = await this.entityManager.findOne(Account, {
        where: {
          id: hostedAccount.id,
        },
        relations: {
          spaces: true,
          virtualContributors: true,
          innovationPacks: true,
          innovationHubs: true,
        },
      });
      if (!account) {
        throw new RelationshipNotFoundException(
          `Unable to find account with ID: ${hostedAccount.id}`,
          LogContext.ACCOUNT
        );
      }
      if (
        account.spaces.length > 0 ||
        account.virtualContributors.length > 0 ||
        account.innovationPacks.length > 0 ||
        account.innovationHubs.length > 0
      ) {
        return true;
      }
    }
    return false;
  }

  public async getAccountsHostedByContributor(
    contributor: IContributor,
    includeSpaces = false
  ): Promise<IAccount[]> {
    let agent = contributor.agent;
    if (!agent) {
      const contributorWithAgent =
        await this.contributorService.getContributorWithRelations(contributor, {
          relations: { agent: true },
        });
      agent = contributorWithAgent.agent;
    }
    const hostedAccountCredentials = await this.entityManager.find(Credential, {
      where: {
        type: AuthorizationCredential.ACCOUNT_HOST,
        agent: {
          id: agent.id,
        },
      },
    });
    const accountIDs = hostedAccountCredentials.map(cred => cred.resourceID);
    const accounts = await this.entityManager.find(Account, {
      where: {
        id: In(accountIDs),
      },
      relations: {
        spaces: includeSpaces,
      },
    });

    return accounts;
  }

  public async getHostCredentials(
    account: IAccount
  ): Promise<ICredentialDefinition[]> {
    const accountHost = await this.getHostOrFail(account);
    const accountHostCredentials: ICredentialDefinition[] = [];
    if (accountHost instanceof User) {
      const userCriteria: ICredentialDefinition = {
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
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

  private async setAccountHost(
    account: IAccount,
    hostContributor: IContributor
  ): Promise<IContributor> {
    // assign the credential
    hostContributor.agent = await this.agentService.grantCredential({
      agentID: hostContributor.agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });

    return hostContributor;
  }
}
