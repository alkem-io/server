import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

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
  constructor(@InjectEntityManager() private manager: EntityManager) {}

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
    const results = await this.manager
      .getRepository(CalloutContribution)
      .createQueryBuilder('contribution')
      .select('contribution.calloutId', 'calloutId')
      .addSelect('COUNT(*)', 'count')
      .where('contribution.calloutId IN (:...calloutIds)', {
        calloutIds: [...calloutIds],
      })
      .groupBy('contribution.calloutId')
      .getRawMany<{ calloutId: string; count: string }>();

    const countsMap = new Map<string, number>();
    for (const row of results) {
      countsMap.set(row.calloutId, parseInt(row.count, 10));
    }

    // Return in input order; 0 for callouts with no contributions
    return calloutIds.map(id => countsMap.get(id) ?? 0);
  }
}
