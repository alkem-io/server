import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { getSelectableValues } from '@domain/common/tagset-template/tagset.template.utils';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Callout } from '../callout.entity';
import { TaskBoardService } from './task.board.service';

/**
 * The database-aware column administration for a Tasks board: create, rename,
 * delete and reorder the columns a board offers. The pure column rules
 * (validation, canonicalisation, ordering) live in {@link TaskBoardService};
 * this service owns persistence and the concurrency guarantee.
 *
 * Every edit runs in one transaction and takes a write lock on the board's
 * driving TagsetTemplate row before it reads the current column set, so a
 * rename, delete, reorder or a concurrent task move never interleave: the
 * column set an edit validates against is the set in force, and the marker
 * sweep a rename/delete performs sees no half-applied state. Each edit also
 * re-pins `defaultSelectedValue` to the first column, keeping the board's
 * "first column is the default" invariant true after every change.
 */
@Injectable()
export class TaskBoardColumnService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private taskBoardService: TaskBoardService
  ) {}

  public async createTaskColumn(
    calloutID: string,
    name: string
  ): Promise<ICallout> {
    return this.withLockedBoard(calloutID, async (manager, template) => {
      const columns = getSelectableValues(template.allowedValues);
      const accepted = this.taskBoardService.validateColumnName(name, columns);
      const next = [...columns, accepted];
      await this.saveColumns(manager, template, next);
    });
  }

  public async renameTaskColumn(
    calloutID: string,
    currentName: string,
    newName: string
  ): Promise<ICallout> {
    return this.withLockedBoard(calloutID, async (manager, template) => {
      const columns = getSelectableValues(template.allowedValues);
      const current = this.matchOrFail(columns, currentName);

      // Validate the new name against every column except the one being
      // renamed, so renaming a column to a case variant of itself is allowed.
      const others = columns.filter(column => column !== current);
      const accepted = this.taskBoardService.validateColumnName(
        newName,
        others
      );

      if (accepted === current) {
        // Nothing changes — neither the column list nor any marker.
        return;
      }

      const next = columns.map(column =>
        column === current ? accepted : column
      );
      await this.saveColumns(manager, template, next);
      // Move every task that named the old column onto the new spelling.
      await this.sweepMarkers(manager, template.id, current, accepted);
    });
  }

  public async deleteTaskColumn(
    calloutID: string,
    name: string
  ): Promise<ICallout> {
    return this.withLockedBoard(calloutID, async (manager, template) => {
      const columns = getSelectableValues(template.allowedValues);
      const target = this.matchOrFail(columns, name);

      // The first column is the board's default and its reflow target; a board
      // must always keep at least one column, so the default can never go.
      if (target === columns[0]) {
        throw new ValidationException(
          'The first task board column is the default and cannot be deleted',
          LogContext.COLLABORATION,
          { column: target }
        );
      }

      const next = columns.filter(column => column !== target);
      await this.saveColumns(manager, template, next);
      // Reflow every task in the removed column onto the default (first) column.
      await this.sweepMarkers(manager, template.id, target, next[0]);
    });
  }

  public async reorderTaskColumns(
    calloutID: string,
    columnNames: string[]
  ): Promise<ICallout> {
    return this.withLockedBoard(calloutID, async (manager, template) => {
      const columns = getSelectableValues(template.allowedValues);

      if (columnNames.length !== columns.length) {
        throw new ValidationException(
          'A task board reorder must list every column exactly once',
          LogContext.COLLABORATION,
          { expected: columns.length, received: columnNames.length }
        );
      }

      // Map each requested name back to its canonical spelling; a reorder is a
      // pure permutation, so every requested column must already exist and none
      // may repeat.
      const seen = new Set<string>();
      const reordered = columnNames.map(requested => {
        const canonical = this.matchOrFail(columns, requested);
        if (seen.has(canonical)) {
          throw new ValidationException(
            'A task board reorder cannot list a column twice',
            LogContext.COLLABORATION,
            { column: canonical }
          );
        }
        seen.add(canonical);
        return canonical;
      });

      // Order-only change: the marker tagsets keep their values untouched.
      await this.saveColumns(manager, template, reordered);
    });
  }

  /**
   * Loads the board, asserts it is one, then runs `work` inside a transaction
   * that holds a write lock on the driving template row. Re-pins the template's
   * `defaultSelectedValue` is the responsibility of {@link saveColumns}, which
   * `work` calls with the new column list.
   */
  private async withLockedBoard(
    calloutID: string,
    work: (manager: EntityManager, template: TagsetTemplate) => Promise<void>
  ): Promise<ICallout> {
    const callout = await this.entityManager.findOne(Callout, {
      where: { id: calloutID },
      relations: {
        classification: { tagsets: { tagsetTemplate: true } },
      },
    });
    if (!callout || !this.taskBoardService.isTaskBoard(callout)) {
      throw new ValidationException(
        'This callout is not a Tasks board',
        LogContext.COLLABORATION,
        { calloutID }
      );
    }

    const templateID =
      this.taskBoardService.getTaskTagset(callout)?.tagsetTemplate?.id;
    if (!templateID) {
      throw new ValidationException(
        'The Tasks board has no column template',
        LogContext.COLLABORATION,
        { calloutID }
      );
    }

    await this.entityManager.transaction(async manager => {
      const lockedTemplate = await manager.findOne(TagsetTemplate, {
        where: { id: templateID },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedTemplate) {
        throw new ValidationException(
          'The Tasks board column template no longer exists',
          LogContext.COLLABORATION,
          { calloutID }
        );
      }
      await work(manager, lockedTemplate);
    });

    return callout;
  }

  /**
   * Persists a new ordered column list on the template and re-pins the default
   * to the first column. Callers pass an already-validated, canonical list.
   */
  private async saveColumns(
    manager: EntityManager,
    template: TagsetTemplate,
    columns: string[]
  ): Promise<void> {
    if (columns.length === 0) {
      throw new ValidationException(
        'A task board must keep at least one column',
        LogContext.COLLABORATION,
        { templateID: template.id }
      );
    }
    template.allowedValues = columns;
    template.defaultSelectedValue = columns[0];
    await manager.save(template);
  }

  /**
   * Rewrites every task marker sitting in `from` to `to`. Only task markers
   * (the reserved 'task' tagset) driven by this board's template are touched.
   * A task marker holds exactly one column value, so a case-insensitive match
   * on the single tag is exact.
   */
  private async sweepMarkers(
    manager: EntityManager,
    templateID: string,
    from: string,
    to: string
  ): Promise<void> {
    const markers = await manager.find(Tagset, {
      where: {
        name: TagsetReservedName.TASK,
        tagsetTemplate: { id: templateID },
      },
      relations: { tagsetTemplate: true },
    });

    const needle = from.toLowerCase();
    const stranded = markers.filter(
      marker => (marker.tags[0] ?? '').toLowerCase() === needle
    );
    for (const marker of stranded) {
      marker.tags = [to];
    }
    if (stranded.length > 0) {
      await manager.save(stranded);
    }
  }

  private matchOrFail(columns: string[], name: string): string {
    const needle = name?.trim().toLowerCase() ?? '';
    const match = columns.find(column => column.toLowerCase() === needle);
    if (!match) {
      throw new ValidationException(
        'That task board column does not exist',
        LogContext.COLLABORATION,
        { column: name }
      );
    }
    return match;
  }
}
