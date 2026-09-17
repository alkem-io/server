import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { TaskColumnCount } from '@domain/collaboration/callout/task-board/dto/task.column.count';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { getSelectableValues } from '@domain/common/tagset-template/tagset.template.utils';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

/**
 * DataLoader creator that resolves the per-column task counts of Tasks board
 * callouts. For N callouts this performs a fixed, small number of grouped
 * queries instead of one board-detection query plus one count query per
 * callout: the board's ordered columns AND the counts are both batched here, so
 * the resolver only calls `load` and never re-fetches the callout.
 *
 * Returns, per callout, the fully resolved `TaskColumnCount[]` — the board's
 * columns in their defined order, zero-filled — or `null` when the callout is
 * not a Tasks board. Board-ness is decided from the marker tagset's template
 * carried in the batched columns query, so a plain (non-board) callout in the
 * same batch resolves to `null` without any extra round trip.
 */
@Injectable()
export class CalloutTaskColumnCountsLoaderCreator
  implements DataLoaderCreator<TaskColumnCount[] | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<TaskColumnCount[] | null> {
    return new DataLoader<string, TaskColumnCount[] | null>(
      async calloutIds => this.batchLoad(calloutIds),
      { cache: true, name: 'CalloutTaskColumnCountsLoader' }
    );
  }

  private async batchLoad(
    calloutIds: readonly string[]
  ): Promise<(TaskColumnCount[] | null)[]> {
    if (calloutIds.length === 0) {
      return [];
    }

    const [columnsByCallout, countsByCallout] = await Promise.all([
      this.loadBoardColumns(calloutIds),
      this.loadColumnCounts(calloutIds),
    ]);

    return calloutIds.map(calloutId => {
      const columns = columnsByCallout.get(calloutId);
      if (!columns) {
        // Not a Tasks board (no marker tagset / template): null, per contract.
        return null;
      }
      const counts = countsByCallout.get(calloutId);
      return columns.map(column => ({
        column,
        count: counts?.get(column) ?? 0,
      }));
    });
  }

  /**
   * The ordered columns of every board callout in the batch, keyed by callout
   * id, in one grouped query: callout → its classification's `task` marker
   * tagset → the driving TagsetTemplate whose `allowedValues` are the ordered
   * columns. Callouts absent from the result are not boards.
   */
  private async loadBoardColumns(
    calloutIds: readonly string[]
  ): Promise<Map<string, string[]>> {
    const rows = await this.manager
      .getRepository(Callout)
      .createQueryBuilder('callout')
      .innerJoin(
        'tagset',
        'taskTagset',
        'taskTagset.classificationId = callout.classificationId AND taskTagset.name = :taskName',
        { taskName: TagsetReservedName.TASK }
      )
      .innerJoin(
        'tagset_template',
        'template',
        'template.id = taskTagset.tagsetTemplateId'
      )
      .select('callout.id', 'calloutId')
      .addSelect('template.allowedValues', 'allowedValues')
      .where('callout.id IN (:...calloutIds)', {
        calloutIds: [...calloutIds],
      })
      .getRawMany<{ calloutId: string; allowedValues: string | null }>();

    const columnsByCallout = new Map<string, string[]>();
    for (const row of rows) {
      // `allowedValues` is a simple-array column: comma-joined on the wire.
      const allowedValues =
        row.allowedValues == null || row.allowedValues === ''
          ? []
          : row.allowedValues.split(',');
      columnsByCallout.set(row.calloutId, getSelectableValues(allowedValues));
    }
    return columnsByCallout;
  }

  /**
   * The raw task counts per column for every callout in the batch, keyed by
   * callout id then by raw column value, in one grouped COUNT query. Columns
   * carrying no tasks are simply absent; the caller zero-fills over the board's
   * own ordered columns.
   */
  private async loadColumnCounts(
    calloutIds: readonly string[]
  ): Promise<Map<string, Map<string, number>>> {
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
    return countsByCallout;
  }
}
