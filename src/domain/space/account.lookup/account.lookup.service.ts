import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { accounts } from '../account/account.schema';
import { users } from '@domain/community/user/user.schema';
import { organizations } from '@domain/community/organization/organization.schema';
import { IAccount } from '../account/account.interface';

type AccountFindOptions = {
  relations?: {
    agent?: boolean;
    spaces?: boolean;
    virtualContributors?: boolean;
    innovationPacks?: boolean;
    innovationHubs?: boolean;
  };
};

@Injectable()
export class AccountLookupService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getAccountOrFail(
    accountID: string,
    options?: AccountFindOptions
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
    options?: AccountFindOptions
  ): Promise<IAccount | null> {
    const withClause: any = {};

    if (options?.relations) {
      if (options.relations.agent) withClause.agent = true;
      if (options.relations.spaces) withClause.spaces = true;
      if (options.relations.virtualContributors) withClause.virtualContributors = true;
      if (options.relations.innovationHubs) withClause.innovationHubs = true;
    }

    const account = await this.db.query.accounts.findFirst({
      where: eq(accounts.id, accountID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    return (account as unknown as IAccount) ?? null;
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
    const user = await this.db.query.users.findFirst({
      where: eq(users.accountID, account.id),
    });
    if (user) {
      return user as unknown as IContributor;
    }
    const organization = await this.db.query.organizations.findFirst({
      where: eq(organizations.accountID, account.id),
    });
    if (organization) {
      return organization as unknown as IContributor;
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
        innovationHubs: true,
      },
    });
    if (
      account.spaces.length > 0 ||
      account.virtualContributors.length > 0 ||
      account.innovationHubs.length > 0
    ) {
      return true;
    }

    return false;
  }
}
