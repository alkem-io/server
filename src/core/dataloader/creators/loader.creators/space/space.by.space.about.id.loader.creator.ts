import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * DataLoader creator for batching Space lookups by SpaceAbout ID.
 * Loads Space with community → roleSet → roles to serve both
 * `isContentPublic` (needs space.settings) and `membership`
 * (needs community.roleSet) resolvers in a single query.
 */
@Injectable()
export class SpaceBySpaceAboutIdLoaderCreator
  implements DataLoaderCreator<ISpace | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

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

    const spaces = await this.manager.find(Space, {
      where: { about: { id: In([...spaceAboutIds]) } },
      relations: { about: true, community: { roleSet: { roles: true } } },
    });

    // Map by about.id for O(1) lookup
    const byAboutId = new Map<string, ISpace>();
    for (const space of spaces) {
      if (space.about) {
        byAboutId.set(space.about.id, space);
      }
    }

    // Return in input order; null for SpaceAbout IDs not found (e.g. TemplateContentSpace)
    return spaceAboutIds.map(id => byAboutId.get(id) ?? null);
  }
}
