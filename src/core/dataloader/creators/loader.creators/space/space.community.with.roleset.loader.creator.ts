import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICommunity } from '@domain/community/community';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * DataLoader creator for batching community+roleSet lookups by SpaceAbout ID.
 * Prevents duplicate queries when both `membership` and `metrics` resolvers
 * need the same community+roleSet data.
 */
@Injectable()
export class SpaceCommunityWithRoleSetLoaderCreator
  implements DataLoaderCreator<ICommunity | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<ICommunity | null> {
    return new DataLoader<string, ICommunity | null>(
      async spaceAboutIds =>
        this.batchLoadBySpaceAboutIds(spaceAboutIds),
      { cache: true, name: 'SpaceCommunityWithRoleSetLoader' }
    );
  }

  private async batchLoadBySpaceAboutIds(
    spaceAboutIds: readonly string[]
  ): Promise<(ICommunity | null)[]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    const spaces = await this.manager.find(Space, {
      where: { about: { id: In([...spaceAboutIds]) } },
      relations: { about: true, community: { roleSet: { roles: true } } },
    });

    // Map by about.id for O(1) lookup
    const byAboutId = new Map<string, ICommunity>();
    for (const space of spaces) {
      if (space.about && space.community) {
        byAboutId.set(space.about.id, space.community);
      }
    }

    // Return in input order; null for SpaceAbout IDs not found
    return spaceAboutIds.map(id => byAboutId.get(id) ?? null);
  }
}
