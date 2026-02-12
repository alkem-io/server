import { RoleName } from '@common/enums/role.name';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * DataLoader creator that resolves space metrics (member count) in batch.
 * Given N spaceAbout IDs, this performs 3 queries total:
 *   1. Load spaces with community → roleSet → roles
 *   2. Batch-count credentials by resourceID (single grouped COUNT)
 * Instead of 2N queries (N role lookups + N credential counts).
 */
@Injectable()
export class SpaceMetricsLoaderCreator
  implements DataLoaderCreator<INVP[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<INVP[]> {
    return new DataLoader<string, INVP[]>(
      async spaceAboutIds => this.batchLoad(spaceAboutIds),
      { cache: true, name: 'SpaceMetricsLoader' }
    );
  }

  private async batchLoad(
    spaceAboutIds: readonly string[]
  ): Promise<INVP[][]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    // Step 1: Load spaces with community → roleSet → roles
    const spaces = await this.manager.find(Space, {
      where: { about: { id: In([...spaceAboutIds]) } },
      relations: {
        about: true,
        community: { roleSet: { roles: true } },
      },
    });

    // Build map: spaceAboutId → { roleSet, memberCredentialResourceID }
    const spaceDataByAboutId = new Map<
      string,
      { resourceID: string }
    >();

    const resourceIDs: string[] = [];

    for (const space of spaces) {
      if (!space.about || !space.community?.roleSet?.roles) continue;

      const memberRole = space.community.roleSet.roles.find(
        r => r.name === RoleName.MEMBER
      );
      if (!memberRole?.credential?.resourceID) continue;

      const resourceID = memberRole.credential.resourceID;
      spaceDataByAboutId.set(space.about.id, { resourceID });
      resourceIDs.push(resourceID);
    }

    // Step 2: Batch count credentials
    const countsByResourceID = new Map<string, number>();

    if (resourceIDs.length > 0) {
      // Deduplicate resourceIDs (subspaces under same L0 might share)
      const uniqueResourceIDs = [...new Set(resourceIDs)];

      const results = await this.manager
        .getRepository(Credential)
        .createQueryBuilder('credential')
        .select('credential.resourceID', 'resourceID')
        .addSelect('COUNT(*)', 'count')
        .where('credential.resourceID IN (:...resourceIDs)', {
          resourceIDs: uniqueResourceIDs,
        })
        .groupBy('credential.resourceID')
        .getRawMany<{ resourceID: string; count: string }>();

      for (const row of results) {
        countsByResourceID.set(row.resourceID, parseInt(row.count, 10));
      }
    }

    // Step 3: Build metrics for each spaceAboutId
    return spaceAboutIds.map(aboutId => {
      const spaceData = spaceDataByAboutId.get(aboutId);
      if (!spaceData) return [];

      const membersCount = countsByResourceID.get(spaceData.resourceID) ?? 0;
      const membersTopic = new NVP('members', membersCount.toString());
      membersTopic.id = `members-${aboutId}`;

      return [membersTopic];
    });
  }
}
