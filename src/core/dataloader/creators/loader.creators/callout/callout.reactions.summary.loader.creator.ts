import { ReactionType } from '@common/enums/reaction.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base/data.loader.creator.options';
import { ILoader } from '@core/dataloader/loader.interface';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

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
 *
 * Delegates the aggregation query to ReactionService.getSummaryForEntities,
 * keeping a single implementation of the GROUP BY and allow-list sort logic.
 */
@Injectable()
export class CalloutReactionsSummaryLoaderCreator
  implements DataLoaderCreator<CalloutReactionsSummaryResult | null>
{
  constructor(private readonly reactionService: ReactionService) {}

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

    const summaries = await this.reactionService.getSummaryForEntities(
      ReactionType.POST,
      calloutIds
    );

    const summaryMap = new Map<string, CalloutReactionsSummaryResult>();
    for (const s of summaries) {
      summaryMap.set(s.entityID, s);
    }

    return calloutIds.map(id => summaryMap.get(id) ?? null);
  }
}
