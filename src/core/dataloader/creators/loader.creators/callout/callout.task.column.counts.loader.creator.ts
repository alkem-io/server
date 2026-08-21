import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

/**
 * DataLoader creator that batches per-column task counts across Tasks board
 * callouts. For N boards this performs a single grouped COUNT query instead of
 * N queries.
 *
 * Returns, per callout, a Map from the raw column value to its task count.
 * Boards with no tasks yield an empty Map. The resolver decides board-ness and
 * is responsible for ordering and zero-filling over the board's own columns —
 * this loader reports only columns that actually carry tasks.
 */
@Injectable()
export class CalloutTaskColumnCountsLoaderCreator
  implements DataLoaderCreator<Map<string, number>>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<Map<string, number>> {
    return new DataLoader<string, Map<string, number>>(
      async calloutIds => this.batchLoad(calloutIds),
      { cache: true, name: 'CalloutTaskColumnCountsLoader' }
    );
  }

  private async batchLoad(
    calloutIds: readonly string[]
  ): Promise<Map<string, number>[]> {
    if (calloutIds.length === 0) {
      return [];
    }

    const results = await this.manager
      .getRepository(CalloutContribution)
      .createQueryBuilder('contribution')
      .innerJoin(
        'tagset',
        'taskTagset',
        'taskTagset.classificationId = contribution.classificationId AND taskTagset.name = :taskName',
        { taskName: TagsetReservedName.TASK }
      )
      .select('contribution.calloutId', 'calloutId')
      .addSelect('taskTagset.tags', 'column')
      .addSelect('COUNT(*)', 'count')
      .where('contribution.calloutId IN (:...calloutIds)', {
        calloutIds: [...calloutIds],
      })
      .groupBy('contribution.calloutId')
      .addGroupBy('taskTagset.tags')
      .getRawMany<{ calloutId: string; column: string; count: string }>();

    const countsByCallout = new Map<string, Map<string, number>>();
    for (const row of results) {
      let columnCounts = countsByCallout.get(row.calloutId);
      if (!columnCounts) {
        columnCounts = new Map<string, number>();
        countsByCallout.set(row.calloutId, columnCounts);
      }
      columnCounts.set(row.column, parseInt(row.count, 10));
    }

    return calloutIds.map(
      id => countsByCallout.get(id) ?? new Map<string, number>()
    );
  }
}
