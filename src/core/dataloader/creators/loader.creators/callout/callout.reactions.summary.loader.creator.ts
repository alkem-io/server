import { ReactionType } from '@common/enums/reaction.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base/data.loader.creator.options';
import { ILoader } from '@core/dataloader/loader.interface';
import { CALLOUT_REACTION_ALLOWED_EMOJIS } from '@domain/collaboration/reaction/reaction.constants';
import { Reaction } from '@domain/collaboration/reaction/reaction.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

export interface CalloutReactionsSummaryResult {
  entityID: string;
  /** Number of distinct people currently holding a reaction. */
  total: number;
  /** Distinct emoji slugs in use, ordered by allow-list position. */
  emojis: string[];
}

/**
 * DataLoader creator that batches callout reaction summaries.
 * For N callouts rendered on a feed page, this performs a single GROUP BY
 * query instead of N individual aggregation queries (tier-1 read).
 */
@Injectable()
export class CalloutReactionsSummaryLoaderCreator
  implements DataLoaderCreator<CalloutReactionsSummaryResult | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    _options: DataLoaderCreatorOptions<CalloutReactionsSummaryResult | null>
  ): ILoader<CalloutReactionsSummaryResult | null> {
    return new DataLoader<string, CalloutReactionsSummaryResult | null>(
      async calloutIds => this.batchLoad(calloutIds),
      { cache: true, name: 'CalloutReactionsSummaryLoader' }
    );
  }

  private async batchLoad(
    calloutIds: readonly string[]
  ): Promise<(CalloutReactionsSummaryResult | null)[]> {
    if (calloutIds.length === 0) return calloutIds.map(() => null);

    const rows = await this.manager
      .getRepository(Reaction)
      .createQueryBuilder('r')
      .select('r.entityID', 'entityID')
      .addSelect('COUNT(DISTINCT r.createdBy)', 'total')
      .addSelect('array_agg(DISTINCT r.emoji)', 'emojis')
      .where('r.type = :type AND r.entityID IN (:...entityIDs)', {
        type: ReactionType.POST,
        entityIDs: [...calloutIds],
      })
      .groupBy('r.entityID')
      .getRawMany<{ entityID: string; total: string; emojis: string[] }>();

    const allowedOrder = CALLOUT_REACTION_ALLOWED_EMOJIS;
    const summaryMap = new Map<string, CalloutReactionsSummaryResult>();
    for (const row of rows) {
      summaryMap.set(row.entityID, {
        entityID: row.entityID,
        total: parseInt(row.total, 10),
        emojis: [...row.emojis].sort((a, b) => {
          const ai = allowedOrder.indexOf(a);
          const bi = allowedOrder.indexOf(b);
          const aPos = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
          const bPos = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
          return aPos - bPos;
        }),
      });
    }

    return calloutIds.map(id => summaryMap.get(id) ?? null);
  }
}
