import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ILoader } from '../../../loader.interface';
import { DataLoaderCreator } from '../../base';

/**
 * Batches lead-organization credential lookups across multiple spaces into a single query.
 * Key format: `credentialType|resourceID` (pipe-separated composite key).
 *
 * Instead of N per-space queries, all credential criteria are collected
 * and resolved in one `organizationsWithCredentialsBatch()` call, keeping
 * the query count constant at 1 regardless of how many spaces are requested.
 */
@Injectable()
export class LeadOrganizationsByRoleSetLoaderCreator
  implements DataLoaderCreator<IOrganization[]>
{
  constructor(private organizationLookupService: OrganizationLookupService) {}

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

    const criteriaArray: CredentialsSearchInput[] = keys.map(key => {
      const [type, resourceID] = key.split('|');
      return { type, resourceID };
    });

    const organizations =
      await this.organizationLookupService.organizationsWithCredentialsBatch(
        criteriaArray
      );

    // Group organizations back by their matching composite key
    return keys.map(key => {
      const [type, resourceID] = key.split('|');
      return organizations.filter(org =>
        org.agent?.credentials?.some(
          cred => cred.type === type && cred.resourceID === resourceID
        )
      );
    });
  }
}
