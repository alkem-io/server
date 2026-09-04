import { AccountDeletionBlockerKind, LogContext } from '@common/enums';
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

export interface AccountResourceBlocker {
  kind: AccountDeletionBlockerKind;
  resourceID: string;
  displayName: string;
}

export interface AccountResourceBlockerTotal {
  kind: AccountDeletionBlockerKind;
  total: number;
}

export interface AccountResourceBlockersResult {
  blockers: AccountResourceBlocker[];
  totals: AccountResourceBlockerTotal[];
  truncated: boolean;
}

@Injectable()
export class AccountLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getAccountOrFail(
    accountID: string,
    options?: FindOneOptions<Account>,
    em?: EntityManager
  ): Promise<IAccount | never> {
    const account = await this.getAccount(accountID, options, em);
    if (!account)
      throw new EntityNotFoundException(
        `Unable to find Account on Host with ID: ${accountID}`,
        LogContext.ACCOUNT
      );
    return account;
  }

  async getAccount(
    accountID: string,
    options?: FindOneOptions<Account>,
    em?: EntityManager
  ): Promise<IAccount | null> {
    // Reads through the caller's transactional EntityManager when supplied,
    // so a re-assertion made from inside a transaction observes that same
    // transaction's snapshot rather than a separately-read view a
    // concurrent write could race.
    const account: IAccount | null = await (em ?? this.entityManager).findOne(
      Account,
      {
        ...options,
        where: { ...options?.where, id: accountID },
      }
    );
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
    // Derived from the same itemization the deletion-blocker read uses, with
    // a cap large enough that truncation never masks a real resource — the
    // boolean only cares whether the total is non-zero.
    const { totals } = await this.getAccountResourceBlockers(accountID, {
      cap: Number.MAX_SAFE_INTEGER,
    });
    return totals.some(total => total.total > 0);
  }

  /**
   * Itemized form of `areResourcesInAccount`: every account-resource
   * (space, virtual contributor, innovation pack, innovation hub) that would
   * block deleting the account, capped and with independent per-kind totals
   * so a capped list never has to be mistaken for a complete one.
   */
  public async getAccountResourceBlockers(
    accountID: string,
    options: { cap: number },
    em?: EntityManager
  ): Promise<AccountResourceBlockersResult> {
    const account = await this.getAccountOrFail(
      accountID,
      {
        relations: {
          spaces: { profile: true },
          virtualContributors: { profile: true },
          innovationPacks: { profile: true },
          innovationHubs: { profile: true },
        },
      },
      em
    );

    const groups: {
      kind: AccountDeletionBlockerKind;
      items: { id: string; displayName: string }[];
    }[] = [
      {
        kind: AccountDeletionBlockerKind.ACCOUNT_SPACE,
        items: account.spaces.map(space => ({
          id: space.id,
          displayName: space.profile?.displayName ?? space.nameID,
        })),
      },
      {
        kind: AccountDeletionBlockerKind.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        items: account.virtualContributors.map(vc => ({
          id: vc.id,
          displayName: vc.profile?.displayName ?? vc.nameID,
        })),
      },
      {
        kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_PACK,
        items: account.innovationPacks.map(pack => ({
          id: pack.id,
          displayName: pack.profile?.displayName ?? pack.nameID,
        })),
      },
      {
        kind: AccountDeletionBlockerKind.ACCOUNT_INNOVATION_HUB,
        items: account.innovationHubs.map(hub => ({
          id: hub.id,
          displayName: hub.profile?.displayName ?? hub.nameID,
        })),
      },
    ];

    const totals: AccountResourceBlockerTotal[] = groups.map(group => ({
      kind: group.kind,
      total: group.items.length,
    }));

    const allItems = groups.flatMap(group =>
      group.items.map(item => ({ kind: group.kind, ...item }))
    );
    const truncated = allItems.length > options.cap;
    const blockers: AccountResourceBlocker[] = allItems
      .slice(0, options.cap)
      .map(item => ({
        kind: item.kind,
        resourceID: item.id,
        displayName: item.displayName,
      }));

    return { blockers, totals, truncated };
  }
}
