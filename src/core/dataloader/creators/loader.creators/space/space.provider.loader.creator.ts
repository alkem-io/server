import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

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
  implements DataLoaderCreator<IActor | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IActor | null> {
    return new DataLoader<string, IActor | null>(
      async spaceAboutIds => this.batchLoad(spaceAboutIds),
      { cache: true, name: 'SpaceProviderLoader' }
    );
  }

  private async batchLoad(
    spaceAboutIds: readonly string[]
  ): Promise<(IActor | null)[]> {
    if (spaceAboutIds.length === 0) {
      return [];
    }

    // Step 1: Load all spaces by about.id
    const spaces = await this.manager.find(Space, {
      where: { about: { id: In([...spaceAboutIds]) } },
      relations: { about: true },
    });

    const spaceByAboutId = new Map<string, Space>();
    for (const space of spaces) {
      if (space.about) {
        spaceByAboutId.set(space.about.id, space);
      }
    }

    // Step 2: Collect unique L0 space IDs that need account loading
    const l0SpaceIds = new Set<string>();
    for (const space of spaces) {
      l0SpaceIds.add(space.levelZeroSpaceID);
    }

    // Batch load L0 spaces with account relation
    const l0Spaces =
      l0SpaceIds.size > 0
        ? await this.manager.find(Space, {
            where: { id: In([...l0SpaceIds]) },
            relations: { account: true },
          })
        : [];

    const l0SpaceById = new Map<string, Space>();
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
    const [users, organizations] =
      accountIdArray.length > 0
        ? await Promise.all([
            this.manager.find(User, {
              where: { accountID: In(accountIdArray) },
            }),
            this.manager.find(Organization, {
              where: { accountID: In(accountIdArray) },
            }),
          ])
        : [[], []];

    // Build accountID → contributor map (user takes precedence)
    const hostByAccountId = new Map<string, IActor>();
    for (const org of organizations) {
      hostByAccountId.set(org.accountID, org);
    }
    for (const user of users) {
      hostByAccountId.set(user.accountID, user);
    }

    // Resolve: spaceAboutId → space → l0Space → account → host
    return spaceAboutIds.map(aboutId => {
      const space = spaceByAboutId.get(aboutId);
      if (!space) return null;

      const l0Space = l0SpaceById.get(space.levelZeroSpaceID);
      if (!l0Space?.account) return null;

      return hostByAccountId.get(l0Space.account.id) ?? null;
    });
  }
}
