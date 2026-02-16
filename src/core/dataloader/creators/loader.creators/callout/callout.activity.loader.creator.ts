import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { count, inArray } from 'drizzle-orm';

/**
 * DataLoader creator that batches callout contribution counts.
 * For N contribution-type callouts, this performs a single grouped COUNT
 * query instead of N individual COUNT queries.
 *
 * Returns 0 for callout IDs with no contributions. The resolver is
 * responsible for routing comment-type callouts to the RPC path
 * before reaching this loader.
 */
@Injectable()
export class CalloutActivityLoaderCreator implements DataLoaderCreator<number> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(): ILoader<number> {
    return new DataLoader<string, number>(
      async calloutIds => this.batchLoad(calloutIds),
      { cache: true, name: 'CalloutActivityLoader' }
    );
  }

  private async batchLoad(calloutIds: readonly string[]): Promise<number[]> {
    if (calloutIds.length === 0) {
      return [];
    }

    // Single grouped COUNT query for all callout IDs
    const results = await this.db
      .select({
        calloutId: calloutContributions.calloutId,
        count: count(),
      })
      .from(calloutContributions)
      .where(inArray(calloutContributions.calloutId, [...calloutIds]))
      .groupBy(calloutContributions.calloutId);

    const countsMap = new Map<string, number>();
    for (const row of results) {
      if (row.calloutId) {
        countsMap.set(row.calloutId, row.count);
      }
    }

    // Return in input order; 0 for callouts with no contributions
    return calloutIds.map(id => countsMap.get(id) ?? 0);
  }
}
