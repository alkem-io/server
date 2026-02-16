import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { organizations } from '@domain/community/organization/organization.schema';
import { users } from '@domain/community/user/user.schema';
import { spaces } from '@domain/space/space/space.schema';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';

/**
 * DataLoader creator that resolves the full provider (host) chain for spaces
 * in batch. Given N spaceAbout IDs, this performs at most 4 queries total:
 *   1. Load spaces by about.id
 *   2. Load L0 spaces with account relation (deduplicated)
 *   3. Load Users by accountID  (parallel with #4)
 *   4. Load Organizations by accountID (parallel with #3)
 */
@Injectable()
export class SpaceProviderLoaderCreator
  implements DataLoaderCreator<IContributor | null>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<IContributor | null> {
    return new DataLoader<string, IContributor | null>(
      async spaceAboutIds => this.batchLoad(spaceAboutIds),
      { cache: true, name: 'SpaceProviderLoader' }
    );
  }

  private async batchLoad(
    spaceAboutIds: readonly string[]
  ): Promise<(IContributor | null)[]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    // Step 1: Load all spaces by about.id
    const spaceResults = await this.db.query.spaces.findMany({
      where: inArray(spaces.aboutId, [...spaceAboutIds]),
      with: {
        about: true,
      },
    });

    const spaceByAboutId = new Map<string, (typeof spaceResults)[number]>();
    for (const space of spaceResults) {
      if (space.about) {
        spaceByAboutId.set(space.about.id, space);
      }
    }

    // Step 2: Collect unique L0 space IDs that need account loading
    const l0SpaceIds = new Set<string>();
    for (const space of spaceResults) {
      if (space.levelZeroSpaceID) {
        l0SpaceIds.add(space.levelZeroSpaceID);
      }
    }

    // Batch load L0 spaces with account relation
    const l0Spaces =
      l0SpaceIds.size > 0
        ? await this.db.query.spaces.findMany({
            where: inArray(spaces.id, [...l0SpaceIds]),
            with: {
              account: true,
            },
          })
        : [];

    const l0SpaceById = new Map<string, (typeof l0Spaces)[number]>();
    for (const l0Space of l0Spaces) {
      l0SpaceById.set(l0Space.id, l0Space);
    }

    // Step 3: Collect unique account IDs for host lookup
    const accountIds = new Set<string>();
    for (const l0Space of l0Spaces) {
      if (l0Space.account) {
        accountIds.add(l0Space.account.id);
      }
    }

    // Batch load users and organizations in parallel
    const accountIdArray = [...accountIds];
    const [userResults, orgResults] =
      accountIdArray.length > 0
        ? await Promise.all([
            this.db.query.users.findMany({
              where: inArray(users.accountID, accountIdArray),
            }),
            this.db.query.organizations.findMany({
              where: inArray(organizations.accountID, accountIdArray),
            }),
          ])
        : [[], []];

    // Build accountID -> contributor map (user takes precedence)
    const hostByAccountId = new Map<string, IContributor>();
    for (const org of orgResults) {
      hostByAccountId.set(org.accountID, org as unknown as IContributor);
    }
    for (const user of userResults) {
      hostByAccountId.set(user.accountID, user as unknown as IContributor);
    }

    // Resolve: spaceAboutId -> space -> l0Space -> account -> host
    return spaceAboutIds.map(aboutId => {
      const space = spaceByAboutId.get(aboutId);
      if (!space?.levelZeroSpaceID) return null;

      const l0Space = l0SpaceById.get(space.levelZeroSpaceID);
      if (!l0Space?.account) return null;

      return hostByAccountId.get(l0Space.account.id) ?? null;
    });
  }
}
