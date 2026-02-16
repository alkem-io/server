import { SYSTEM_ACTOR_IDS } from '@common/constants/system.actor.ids';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';

/**
 * DataLoader creator for batching contributor lookups by agent ID.
 * This prevents N+1 queries when resolving message senders and reaction senders.
 * Queries User, Organization, and VirtualContributor entities in parallel.
 */
@Injectable()
export class ContributorByAgentIdLoaderCreator
  implements DataLoaderCreator<IContributor | null>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<IContributor | null> {
    return new DataLoader<string, IContributor | null>(
      async agentIds => this.batchLoadByAgentIds(agentIds),
      { cache: true, name: 'ContributorByAgentIdLoader' }
    );
  }

  private async batchLoadByAgentIds(
    agentIds: readonly string[]
  ): Promise<(IContributor | null)[]> {
    // Filter out system actors and invalid UUIDs
    const validIds = [...agentIds].filter(
      id => !SYSTEM_ACTOR_IDS.has(id) && isUUID(id)
    );

    if (validIds.length === 0) {
      return agentIds.map(() => null);
    }

    // Parallel batch queries for all contributor types
    const [users, orgs, vcs] = await Promise.all([
      this.db.query.users.findMany({
        where: (table, { inArray }) => inArray(table.agentId, validIds),
        with: { agent: true, profile: true },
      }) as Promise<IContributor[]>,
      this.db.query.organizations.findMany({
        where: (table, { inArray }) => inArray(table.agentId, validIds),
        with: { agent: true, profile: true },
      }) as Promise<IContributor[]>,
      this.db.query.virtualContributors.findMany({
        where: (table, { inArray }) => inArray(table.agentId, validIds),
        with: { agent: true, profile: true },
      }) as Promise<IContributor[]>,
    ]);

    // Map by agent ID for O(1) lookup
    const byAgentId = new Map<string, IContributor>();
    for (const u of users) if ((u as any).agent) byAgentId.set((u as any).agent.id, u);
    for (const o of orgs) if ((o as any).agent) byAgentId.set((o as any).agent.id, o);
    for (const vc of vcs) if ((vc as any).agent) byAgentId.set((vc as any).agent.id, vc);

    // Return in input order
    return agentIds.map(id => byAgentId.get(id) ?? null);
  }
}
