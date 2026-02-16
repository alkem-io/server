import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ILoader } from '../../../loader.interface';
import { DataLoaderCreator } from '../../base';

/**
 * Batches lead-user credential lookups across multiple spaces into a single query.
 * Key format: `credentialType|resourceID` (pipe-separated composite key).
 *
 * Instead of N per-space queries, all credential criteria are collected
 * and resolved in one `usersWithCredentials()` call, keeping the query
 * count constant at 1 regardless of how many spaces are requested.
 */
@Injectable()
export class LeadUsersByRoleSetLoaderCreator
  implements DataLoaderCreator<IUser[]>
{
  constructor(private userLookupService: UserLookupService) {}

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

    const criteriaArray: CredentialsSearchInput[] = keys.map(key => {
      const [type, resourceID] = key.split('|');
      return { type, resourceID };
    });

    const users =
      await this.userLookupService.usersWithCredentials(criteriaArray);

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
