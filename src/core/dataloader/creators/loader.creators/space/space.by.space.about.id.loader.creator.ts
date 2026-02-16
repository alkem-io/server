import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

/**
 * DataLoader creator for batching Space lookups by SpaceAbout ID.
 * Prevents N+1 queries in resolvers that need to load a Space from its SpaceAbout.
 */
@Injectable()
export class SpaceBySpaceAboutIdLoaderCreator
  implements DataLoaderCreator<ISpace | null>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<ISpace | null> {
    return new DataLoader<string, ISpace | null>(
      async spaceAboutIds => this.batchLoadBySpaceAboutIds(spaceAboutIds),
      { cache: true, name: 'SpaceBySpaceAboutIdLoader' }
    );
  }

  private async batchLoadBySpaceAboutIds(
    spaceAboutIds: readonly string[]
  ): Promise<(ISpace | null)[]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    const spacesList = await this.db.query.spaces.findMany({
      where: (table, { inArray }) => inArray(table.aboutId, [...spaceAboutIds]),
      with: { about: true },
    }) as unknown as ISpace[];

    // Map by about.id for O(1) lookup
    const byAboutId = new Map<string, ISpace>();
    for (const space of spacesList) {
      if (space.about) {
        byAboutId.set(space.about.id, space);
      }
    }

    // Return in input order; null for SpaceAbout IDs not found (e.g. TemplateContentSpace)
    return spaceAboutIds.map(id => byAboutId.get(id) ?? null);
  }
}
