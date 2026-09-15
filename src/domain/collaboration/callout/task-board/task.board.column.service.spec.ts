import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Callout } from '../callout.entity';
import { TaskBoardColumnService } from './task.board.column.service';
import { TaskBoardService } from './task.board.service';

const COLUMNS = ['Backlog', 'To do', 'In progress', 'Done'];

describe('TaskBoardColumnService', () => {
  let service: TaskBoardColumnService;
  let templateRow: {
    id: string;
    allowedValues: string[];
    defaultSelectedValue?: string;
  };
  let markerRows: { id: string; name: string; tags: string[] }[];
  let savedTemplates: any[];
  let savedMarkers: any[][];
  let outerFindOne: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;

  function boardCallout() {
    return {
      id: 'callout-1',
      classification: {
        tagsets: [
          {
            name: TagsetReservedName.TASK,
            tags: ['Backlog'],
            tagsetTemplate: { id: 'tmpl-1', allowedValues: COLUMNS },
          },
        ],
      },
    } as any;
  }

  beforeEach(async () => {
    vi.restoreAllMocks();

    templateRow = { id: 'tmpl-1', allowedValues: [...COLUMNS] };
    markerRows = [
      { id: 'm-1', name: TagsetReservedName.TASK, tags: ['To do'] },
      { id: 'm-2', name: TagsetReservedName.TASK, tags: ['In progress'] },
      { id: 'm-3', name: TagsetReservedName.TASK, tags: ['To do'] },
    ];
    savedTemplates = [];
    savedMarkers = [];

    outerFindOne = vi.fn(async (entity: any) => {
      if (entity === Callout) return boardCallout();
      return null;
    });

    const managerFindOne = vi.fn(async (entity: any) => {
      if (entity === TagsetTemplate) return templateRow;
      return null;
    });
    const managerFind = vi.fn(async (entity: any) => {
      if (entity === Tagset) return markerRows;
      return [];
    });
    const managerSave = vi.fn(async (arg: any) => {
      if (Array.isArray(arg)) {
        savedMarkers.push(arg);
      } else {
        savedTemplates.push({ ...arg });
      }
      return arg;
    });
    const manager = {
      findOne: managerFindOne,
      find: managerFind,
      save: managerSave,
    };
    transaction = vi.fn(async (cb: any) => cb(manager));

    const entityManager = {
      findOne: outerFindOne,
      transaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskBoardColumnService,
        TaskBoardService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
      ],
    }).compile();

    service = module.get(TaskBoardColumnService);
  });

  describe('createTaskColumn', () => {
    it('appends the trimmed column and re-pins the default to the first', async () => {
      await service.createTaskColumn('callout-1', '  Review  ');

      expect(templateRow.allowedValues).toEqual([...COLUMNS, 'Review']);
      expect(templateRow.defaultSelectedValue).toEqual('Backlog');
    });

    it('rejects a duplicate column (case-insensitive) via the shared validator', async () => {
      await expect(
        service.createTaskColumn('callout-1', 'backlog')
      ).rejects.toThrow(ValidationException);
      expect(savedTemplates).toHaveLength(0);
    });
  });

  describe('renameTaskColumn', () => {
    it('swaps the value and sweeps every task marker in that column', async () => {
      await service.renameTaskColumn('callout-1', 'To do', 'Ready');

      expect(templateRow.allowedValues).toEqual([
        'Backlog',
        'Ready',
        'In progress',
        'Done',
      ]);
      // Both 'To do' markers moved; the 'In progress' marker is untouched.
      expect(markerRows[0].tags).toEqual(['Ready']);
      expect(markerRows[2].tags).toEqual(['Ready']);
      expect(markerRows[1].tags).toEqual(['In progress']);
    });

    it('re-spells a column to a case variant of itself and sweeps its markers', async () => {
      await service.renameTaskColumn('callout-1', 'To do', 'to DO');

      // A case-only rename is still a rename: the new spelling is stored and
      // the markers are moved onto it, but no uniqueness collision is raised.
      expect(templateRow.allowedValues).toEqual([
        'Backlog',
        'to DO',
        'In progress',
        'Done',
      ]);
      expect(markerRows[0].tags).toEqual(['to DO']);
      expect(markerRows[2].tags).toEqual(['to DO']);
    });

    it('rejects renaming onto an existing different column', async () => {
      await expect(
        service.renameTaskColumn('callout-1', 'To do', 'Done')
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteTaskColumn', () => {
    it('rejects deleting the first (default) column', async () => {
      await expect(
        service.deleteTaskColumn('callout-1', 'backlog')
      ).rejects.toThrow(ValidationException);
      expect(savedTemplates).toHaveLength(0);
    });

    it('drops the column and reflows its tasks onto the default', async () => {
      await service.deleteTaskColumn('callout-1', 'To do');

      expect(templateRow.allowedValues).toEqual([
        'Backlog',
        'In progress',
        'Done',
      ]);
      // The two 'To do' markers reflow onto the first column.
      expect(markerRows[0].tags).toEqual(['Backlog']);
      expect(markerRows[2].tags).toEqual(['Backlog']);
      expect(markerRows[1].tags).toEqual(['In progress']);
    });
  });

  describe('reorderTaskColumns', () => {
    it('rewrites the order without touching any marker', async () => {
      await service.reorderTaskColumns('callout-1', [
        'Done',
        'In progress',
        'To do',
        'Backlog',
      ]);

      expect(templateRow.allowedValues).toEqual([
        'Done',
        'In progress',
        'To do',
        'Backlog',
      ]);
      expect(templateRow.defaultSelectedValue).toEqual('Done');
      expect(savedMarkers).toHaveLength(0);
    });

    it('rejects a list that is not a permutation of the columns', async () => {
      await expect(
        service.reorderTaskColumns('callout-1', [
          'Done',
          'In progress',
          'To do',
        ])
      ).rejects.toThrow(ValidationException);
    });

    it('rejects a list that repeats a column', async () => {
      await expect(
        service.reorderTaskColumns('callout-1', [
          'Done',
          'Done',
          'To do',
          'Backlog',
        ])
      ).rejects.toThrow(ValidationException);
    });
  });

  it('locks the template row before mutating on every op', async () => {
    await service.createTaskColumn('callout-1', 'Review');

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an edit against a non-board callout', async () => {
    outerFindOne.mockResolvedValue({
      id: 'callout-1',
      classification: { tagsets: [{ name: 'default', tags: [] }] },
    } as any);

    await expect(
      service.createTaskColumn('callout-1', 'Review')
    ).rejects.toThrow(ValidationException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
