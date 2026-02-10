import { SYSTEM_ACTOR_IDS } from '@common/constants/system.actor.ids';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * DataLoader creator for batching contributor lookups by agent ID.
 * This prevents N+1 queries when resolving message senders and reaction senders.
 * Queries User, Organization, and VirtualContributor entities in parallel.
 */
@Injectable()
export class ContributorByAgentIdLoaderCreator
  implements DataLoaderCreator<IContributor | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

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
      this.manager.find(User, {
        where: { agent: { id: In(validIds) } },
        relations: { agent: true, profile: true },
      }),
      this.manager.find(Organization, {
        where: { agent: { id: In(validIds) } },
        relations: { agent: true, profile: true },
      }),
      this.manager.find(VirtualContributor, {
        where: { agent: { id: In(validIds) } },
        relations: { agent: true, profile: true },
      }),
    ]);

    // Map by agent ID for O(1) lookup
    const byAgentId = new Map<string, IContributor>();
    for (const u of users) if (u.agent) byAgentId.set(u.agent.id, u);
    for (const o of orgs) if (o.agent) byAgentId.set(o.agent.id, o);
    for (const vc of vcs) if (vc.agent) byAgentId.set(vc.agent.id, vc);

    // Return in input order
    return agentIds.map(id => byAgentId.get(id) ?? null);
  }
}
