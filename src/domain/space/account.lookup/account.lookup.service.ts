import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions } from 'typeorm';
import { Account } from '../account/account.entity';
import { IAccount } from '../account/account.interface';

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

  public async getHostOrFail(account: IAccount): Promise<IActor> {
    const host = await this.getHost(account);
    if (!host)
      throw new EntityNotFoundException(
        `Unable to find Host for account with ID: ${account.id}`,
        LogContext.COMMUNITY
      );
    return host;
  }

  public async getHost(account: IAccount): Promise<IActor | null> {
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

    this.logger.warn(
      `Unable to find contributor associated with account: ${account.id}`,
      LogContext.ACCOUNT
    );
    return null;
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
}
