import { RoleName } from '@common/enums/role.name';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { credentials } from '@domain/agent/credential/credential.schema';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { spaces } from '@domain/space/space/space.schema';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { and, count, inArray } from 'drizzle-orm';

/**
 * DataLoader creator that resolves space metrics (member count) in batch.
 * Given N spaceAbout IDs, this performs 3 queries total:
 *   1. Load spaces with community -> roleSet -> roles
 *   2. Batch-count credentials by resourceID (single grouped COUNT)
 * Instead of 2N queries (N role lookups + N credential counts).
 */
@Injectable()
export class SpaceMetricsLoaderCreator implements DataLoaderCreator<INVP[]> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<INVP[]> {
    return new DataLoader<string, INVP[]>(
      async spaceAboutIds => this.batchLoad(spaceAboutIds),
      { cache: true, name: 'SpaceMetricsLoader' }
    );
  }

  private async batchLoad(spaceAboutIds: readonly string[]): Promise<INVP[][]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    // Step 1: Load spaces with community -> roleSet -> roles
    const spaceResults = await this.db.query.spaces.findMany({
      where: inArray(spaces.aboutId, [...spaceAboutIds]),
      with: {
        about: true,
        community: {
          with: {
            roleSet: {
              with: {
                roles: true,
              },
            },
          },
        },
      },
    });

    // Build map: spaceAboutId -> { resourceID, type }
    const spaceDataByAboutId = new Map<
      string,
      { resourceID: string; type: string }
    >();

    const resourceIDs: string[] = [];
    const types: string[] = [];

    for (const space of spaceResults) {
      if (!space.about || !(space.community as any)?.roleSet?.roles) continue;

      const roleSet = (space.community as any).roleSet;
      const memberRole = roleSet.roles.find(
        (r: any) => r.name === RoleName.MEMBER
      );
      if (!memberRole?.credential?.resourceID) continue;

      const resourceID = memberRole.credential.resourceID;
      const type = memberRole.credential.type;
      spaceDataByAboutId.set(space.about.id, { resourceID, type });
      resourceIDs.push(resourceID);
      types.push(type);
    }

    // Step 2: Batch count credentials
    const countsByResourceID = new Map<string, number>();

    if (resourceIDs.length > 0) {
      // Deduplicate resourceIDs and types (subspaces under same L0 might share)
      const uniqueResourceIDs = [...new Set(resourceIDs)];
      const uniqueTypes = [...new Set(types)];

      const results = await this.db
        .select({
          resourceID: credentials.resourceID,
          count: count(),
        })
        .from(credentials)
        .where(
          and(
            inArray(credentials.resourceID, uniqueResourceIDs),
            inArray(credentials.type, uniqueTypes)
          )
        )
        .groupBy(credentials.resourceID);

      for (const row of results) {
        countsByResourceID.set(row.resourceID, row.count);
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
