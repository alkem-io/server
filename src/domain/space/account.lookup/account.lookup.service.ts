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
import { Account } from '../account/account.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions } from 'typeorm';
import { IAgent } from '@domain/agent/agent/agent.interface';

@Injectable()
export class AccountLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getAccountOrFail(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | never> {
    const account = await this.getAccount(accountID, options);
    if (!account)
      throw new EntityNotFoundException(
        `Unable to find Account on Host with ID: ${accountID}`,
        LogContext.ACCOUNT
      );
    return account;
  }

  async getAccount(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | null> {
    const account: IAccount | null = await this.entityManager.findOne(Account, {
      ...options,
      where: { ...options?.where, id: accountID },
    });
    return account;
  }

  public async getAgent(accountID: string): Promise<IAgent> {
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        agent: true,
      },
    });

    if (!account.agent) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Agent for Account: ${account.id}`,
        LogContext.PLATFORM
      );
    }

    return account.agent;
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
}
