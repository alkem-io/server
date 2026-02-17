import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICommunity } from '@domain/community/community';
import { spaceAbouts } from '@domain/space/space.about/space.about.schema';
import { spaces } from '@domain/space/space/space.schema';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';

/**
 * DataLoader creator for batching community+roleSet lookups by SpaceAbout ID.
 * Prevents duplicate queries when both `membership` and `metrics` resolvers
 * need the same community+roleSet data.
 */
@Injectable()
export class SpaceCommunityWithRoleSetLoaderCreator
  implements DataLoaderCreator<ICommunity | null>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<ICommunity | null> {
    return new DataLoader<string, ICommunity | null>(
      async spaceAboutIds => this.batchLoadBySpaceAboutIds(spaceAboutIds),
      { cache: true, name: 'SpaceCommunityWithRoleSetLoader' }
    );
  }

  private async batchLoadBySpaceAboutIds(
    spaceAboutIds: readonly string[]
  ): Promise<(ICommunity | null)[]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    const spaceResults = await this.db.query.spaces.findMany({
      where: inArray(spaces.aboutId, [...spaceAboutIds]),
      with: {
        about: true,
        community: {
          with: {
            roleSet: {
              with: {
                roles: true,
                authorization: true,
              },
            },
          },
        },
      },
    });

    // Map by about.id for O(1) lookup
    const byAboutId = new Map<string, ICommunity>();
    for (const space of spaceResults) {
      if (space.about && space.community) {
        byAboutId.set(space.about.id, space.community as unknown as ICommunity);
      }
    }

    // Return in input order; null for SpaceAbout IDs not found
    return spaceAboutIds.map(id => byAboutId.get(id) ?? null);
  }
}
