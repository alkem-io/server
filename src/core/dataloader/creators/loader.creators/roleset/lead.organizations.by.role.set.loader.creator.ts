import { Organization } from '@domain/community/organization/organization.entity';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { ILoader } from '../../../loader.interface';
import { DataLoaderCreator } from '../../base';

/**
 * Batches lead-organization credential lookups across multiple spaces into a single query.
 * Key format: `credentialType|resourceID` (pipe-separated composite key).
 *
 * Instead of N per-space queries, all credential criteria are collected
 * and resolved in one query, keeping the query count constant at 1
 * regardless of how many spaces are requested.
 */
@Injectable()
export class LeadOrganizationsByRoleSetLoaderCreator
  implements DataLoaderCreator<IOrganization[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IOrganization[]> {
    return new DataLoader<string, IOrganization[]>(
      async keys => this.batchLoadOrganizations(keys),
      { cache: true, name: 'LeadOrganizationsByRoleSetLoader' }
    );
  }

  private async batchLoadOrganizations(
    keys: readonly string[]
  ): Promise<IOrganization[][]> {
    if (keys.length === 0) {
      return [];
    }

    const whereConditions = keys.map(key => {
      const [type, resourceID] = key.split('|');
      return {
        credentials: { type, resourceID: resourceID || '' },
      };
    });

    const organizations = await this.manager.find(Organization, {
      where: whereConditions,
      relations: { credentials: true },
    });

    // Group organizations back by their matching composite key
    return keys.map(key => {
      const [type, resourceID] = key.split('|');
      return organizations.filter(org =>
        org.credentials?.some(
          cred => cred.type === type && cred.resourceID === resourceID
        )
      );
    });
  }
}
