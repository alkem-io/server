import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { ILoader } from '../../../loader.interface';
import { DataLoaderCreator } from '../../base';

/**
 * Batches lead-user credential lookups across multiple spaces into a single query.
 * Key format: `credentialType|resourceID` (pipe-separated composite key).
 *
 * Instead of N per-space queries, all credential criteria are collected
 * and resolved in one query, keeping the query count constant at 1
 * regardless of how many spaces are requested.
 */
@Injectable()
export class LeadUsersByRoleSetLoaderCreator
  implements DataLoaderCreator<IUser[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IUser[]> {
    return new DataLoader<string, IUser[]>(
      async keys => this.batchLoadUsers(keys),
      { cache: true, name: 'LeadUsersByRoleSetLoader' }
    );
  }

  private async batchLoadUsers(keys: readonly string[]): Promise<IUser[][]> {
    if (keys.length === 0) {
      return [];
    }

    const whereConditions = keys.map(key => {
      const [type, resourceID] = key.split('|');
      return {
        agent: {
          credentials: { type, resourceID: resourceID || '' },
        },
      };
    });

    const users = await this.manager.find(User, {
      where: whereConditions,
      relations: { agent: { credentials: true } },
    });

    // Group users back by their matching composite key
    return keys.map(key => {
      const [type, resourceID] = key.split('|');
      return users.filter(user =>
        user.agent?.credentials?.some(
          cred => cred.type === type && cred.resourceID === resourceID
        )
      );
    });
  }
}
