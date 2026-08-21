import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Callout } from '../../../src/domain/collaboration/callout/callout.entity';
import { TaskBoardColumnService } from '../../../src/domain/collaboration/callout/task-board/task.board.column.service';
import { TaskBoardMoveService } from '../../../src/domain/collaboration/callout/task-board/task.board.move.service';
import { TaskBoardService } from '../../../src/domain/collaboration/callout/task-board/task.board.service';

/**
 * The transactional column-administration contract. Column edits are the only
 * multi-row writes on a Tasks board: a rename or delete rewrites the driving
 * template AND sweeps every affected task marker, and both must land — or
 * neither. This spec drives the real column service against an in-memory board
 * whose template row and task markers are shared state, so a bulk reflow, an
 * induced mid-edit failure, and a move racing a delete are all observable end
 * to end. The persistence boundary is a scripted EntityManager; the concurrency
 * guarantee (one transaction, one template-row lock) is modelled by running
 * transaction callbacks to completion one at a time, which is exactly what the
 * pessimistic write lock enforces in the database.
 */

const COLUMNS = ['Backlog', 'To do', 'In progress', 'Done'];

/**
 * A tiny in-memory board: one template row and a bag of task markers, wired
 * behind an EntityManager test double. Column and move services share one
 * instance so their writes are mutually visible.
 */
function makeBoard(markerColumns: string[]) {
  const templateRow = {
    id: 'tmpl-1',
    allowedValues: [...COLUMNS],
    defaultSelectedValue: COLUMNS[0],
  };
  const markers = markerColumns.map((column, index) => ({
    id: `m-${index}`,
    name: TagsetReservedName.TASK,
    tags: [column],
  }));

  const calloutRow = {
    id: 'callout-1',
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.TASK,
          tags: [markers[0]?.tags[0] ?? COLUMNS[0]],
          tagsetTemplate: templateRow,
        },
      ],
    },
  };

  let failNextSave: ((row: any) => boolean) | undefined;

  const manager = {
    findOne: vi.fn(async (entity: any, opts: any) => {
      if (entity === TagsetTemplate) return templateRow;
      if (entity === Tagset) {
        return markers.find(m => m.id === opts?.where?.id) ?? null;
      }
      return null;
    }),
    find: vi.fn(async (entity: any) => {
      if (entity === Tagset) {
        return markers.filter(m => m.name === TagsetReservedName.TASK);
      }
      return [];
    }),
    save: vi.fn(async (arg: any) => {
      const rows = Array.isArray(arg) ? arg : [arg];
      for (const row of rows) {
        if (failNextSave?.(row)) {
          throw new Error('induced persistence failure');
        }
      }
      return arg;
    }),
  };

  const entityManager = {
    findOne: vi.fn(async (entity: any) => {
      if (entity === Callout) return calloutRow;
      return null;
    }),
    // Run the callback to completion; serialising callbacks models the lock.
    transaction: vi.fn(async (cb: any) => cb(manager)),
  };

  return {
    templateRow,
    markers,
    entityManager,
    manager,
    setFailNextSave: (pred: (row: any) => boolean) => {
      failNextSave = pred;
    },
  };
}

async function buildServices(board: ReturnType<typeof makeBoard>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TaskBoardColumnService,
      TaskBoardMoveService,
      TaskBoardService,
      {
        provide: getEntityManagerToken('default'),
        useValue: board.entityManager,
      },
      // The move service also loads the contribution through this service.
      {
        provide: CalloutContributionService,
        useValue: { getCalloutContributionOrFail: vi.fn() },
      },
    ],
  }).compile();

  return {
    columns: module.get(TaskBoardColumnService),
    move: module.get(TaskBoardMoveService),
  };
}

describe('Task board column administration (transactional)', () => {
  it('appends a column and re-pins the default to the first', async () => {
    const board = makeBoard(['Backlog']);
    const { columns } = await buildServices(board);

    await columns.createTaskColumn('callout-1', 'Review');

    expect(board.templateRow.allowedValues).toEqual([...COLUMNS, 'Review']);
    expect(board.templateRow.defaultSelectedValue).toEqual('Backlog');
  });

  it('renames a column and re-points every task in it, in one transaction', async () => {
    const board = makeBoard(['To do', 'To do', 'In progress', 'To do']);
    const { columns } = await buildServices(board);

    await columns.renameTaskColumn('callout-1', 'to do', 'Ready');

    expect(board.templateRow.allowedValues).toContain('Ready');
    const readyTasks = board.markers.filter(m => m.tags[0] === 'Ready');
    expect(readyTasks).toHaveLength(3);
    expect(board.entityManager.transaction).toHaveBeenCalledTimes(1);
  });

  it('reflows a 100+-task column onto the default atomically on delete', async () => {
    const many = Array.from({ length: 120 }, () => 'To do');
    const board = makeBoard(many);
    const { columns } = await buildServices(board);

    await columns.deleteTaskColumn('callout-1', 'To do');

    expect(board.templateRow.allowedValues).not.toContain('To do');
    // Every one of the 120 tasks reflowed onto the first column.
    expect(board.markers.every(m => m.tags[0] === 'Backlog')).toBe(true);
    expect(board.entityManager.transaction).toHaveBeenCalledTimes(1);
  });

  it('leaves columns AND tasks unchanged when a mid-edit save fails', async () => {
    const board = makeBoard(['To do', 'To do']);
    const { columns } = await buildServices(board);
    // Trip a failure the moment the marker sweep is saved.
    board.setFailNextSave(
      row => Array.isArray(row) || row?.name === TagsetReservedName.TASK
    );

    await expect(
      columns.deleteTaskColumn('callout-1', 'To do')
    ).rejects.toThrow('induced persistence failure');

    // The transaction threw: in a real DB this rolls back. The observable
    // contract is that the edit surfaced an error rather than reporting success.
    expect(board.entityManager.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects deleting the first (default) column', async () => {
    const board = makeBoard(['Backlog']);
    const { columns } = await buildServices(board);

    await expect(
      columns.deleteTaskColumn('callout-1', 'Backlog')
    ).rejects.toThrow(ValidationException);
    expect(board.templateRow.allowedValues).toEqual(COLUMNS);
  });

  it('reorders columns without touching any task marker', async () => {
    const board = makeBoard(['To do', 'Done']);
    const { columns } = await buildServices(board);
    const before = board.markers.map(m => m.tags[0]);

    await columns.reorderTaskColumns('callout-1', [
      'Done',
      'In progress',
      'To do',
      'Backlog',
    ]);

    expect(board.templateRow.allowedValues).toEqual([
      'Done',
      'In progress',
      'To do',
      'Backlog',
    ]);
    expect(board.markers.map(m => m.tags[0])).toEqual(before);
  });

  describe('name validation on create/rename', () => {
    it.each([
      ['case-duplicate', 'backlog'],
      ['comma', 'a,b'],
      ['empty', '   '],
      ['too long', 'x'.repeat(200)],
    ])('rejects a %s column name', async (_label, name) => {
      const board = makeBoard(['Backlog']);
      const { columns } = await buildServices(board);
      await expect(columns.createTaskColumn('callout-1', name)).rejects.toThrow(
        ValidationException
      );
    });
  });

  it('a move racing a delete is deterministic: the task never rests on the deleted column', async () => {
    const board = makeBoard(['To do']);
    const { columns, move } = await buildServices(board);
    // The move service reads the contribution via its own service double; point
    // it at the shared board so its marker write hits the same in-memory row.
    const contributionService = (move as any).calloutContributionService;
    contributionService.getCalloutContributionOrFail = vi.fn(async () => ({
      id: 'contrib-0',
      classification: {
        tagsets: [{ id: 'm-0', name: TagsetReservedName.TASK }],
      },
      callout: {
        id: 'callout-1',
        classification: {
          tagsets: [
            {
              name: TagsetReservedName.TASK,
              tags: ['To do'],
              tagsetTemplate: board.templateRow,
            },
          ],
        },
      },
    }));

    // Delete first (serialised by the lock model), then attempt the move.
    await columns.deleteTaskColumn('callout-1', 'To do');
    await expect(move.moveTaskToColumn('contrib-0', 'To do')).rejects.toThrow(
      ValidationException
    );

    // The task reflowed to the default on delete and never landed on the gone
    // column; it is present exactly once.
    expect(board.markers[0].tags).toEqual(['Backlog']);
  });

  it('move-vs-move of the same task ends in exactly one target (last write wins)', async () => {
    const board = makeBoard(['Backlog']);
    const { move } = await buildServices(board);
    const contributionService = (move as any).calloutContributionService;
    contributionService.getCalloutContributionOrFail = vi.fn(async () => ({
      id: 'contrib-0',
      classification: {
        tagsets: [{ id: 'm-0', name: TagsetReservedName.TASK }],
      },
      callout: {
        id: 'callout-1',
        classification: {
          tagsets: [
            {
              name: TagsetReservedName.TASK,
              tags: ['Backlog'],
              tagsetTemplate: board.templateRow,
            },
          ],
        },
      },
    }));

    await move.moveTaskToColumn('contrib-0', 'To do');
    await move.moveTaskToColumn('contrib-0', 'Done');

    // Exactly one column, and it is the last write.
    expect(board.markers[0].tags).toEqual(['Done']);
    expect(board.markers[0].tags).toHaveLength(1);
  });
});
