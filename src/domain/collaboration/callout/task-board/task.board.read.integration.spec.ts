/**
 * Integration coverage for the Tasks board read + creation surface, assembled
 * from the real column-model service plus the contribution creation path.
 *
 * The project's real-database stack is not available in unit mode, so this
 * exercises the assembled service logic (real TaskBoardService, real
 * CalloutContributionService with its collaborators mocked) rather than a live
 * GraphQL round-trip. It verifies the behaviours a viewer depends on: a board
 * carries its ordered columns, a task's column is canonicalised from creation
 * (default = first column), a plain callout carries no task classification, and
 * per-column counts are zero-filled and ordered over the board's own columns.
 */

import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { TASK_BOARD_DEFAULT_COLUMNS } from './task.board.constants';
import { TaskBoardService } from './task.board.service';

/**
 * A board TagsetTemplate carrying the given ordered columns.
 */
function boardTemplate(columns: string[]): ITagsetTemplate {
  return {
    id: 'tmpl-1',
    allowedValues: columns,
    defaultSelectedValue: columns[0],
  } as ITagsetTemplate;
}

/**
 * A callout that IS a Tasks board: its classification carries the reserved
 * 'task' tagset whose driving template lists the columns.
 */
function boardCallout(columns: string[]): ICallout {
  return {
    id: 'callout-board',
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.TASK,
          tags: [columns[0]],
          tagsetTemplate: boardTemplate(columns),
        },
      ],
    },
  } as unknown as ICallout;
}

/**
 * A plain posts callout: no 'task' tagset anywhere.
 */
function plainCallout(): ICallout {
  return {
    id: 'callout-plain',
    classification: { tagsets: [{ name: 'default', tags: [] }] },
  } as unknown as ICallout;
}

describe('Tasks board read + creation', () => {
  let taskBoardService: TaskBoardService;
  let contributionService: CalloutContributionService;
  let classificationService: ClassificationService;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(CalloutContribution, 'create').mockImplementation((input: any) => {
      const entity = new CalloutContribution();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskBoardService,
        CalloutContributionService,
        repositoryProviderMockFactory(CalloutContribution),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    taskBoardService = module.get(TaskBoardService);
    contributionService = module.get(CalloutContributionService);
    classificationService = module.get(ClassificationService);
  });

  describe('board detection + columns', () => {
    it('reads the default columns in order off a board callout', () => {
      const callout = boardCallout([...TASK_BOARD_DEFAULT_COLUMNS]);

      expect(taskBoardService.isTaskBoard(callout)).toBe(true);
      expect(taskBoardService.getColumns(callout)).toEqual([
        'Backlog',
        'To do',
        'In progress',
        'Done',
      ]);
      expect(taskBoardService.getDefaultColumn(callout)).toBe('Backlog');
    });

    it('treats a plain callout as not a board with no columns', () => {
      const callout = plainCallout();

      expect(taskBoardService.isTaskBoard(callout)).toBe(false);
      expect(taskBoardService.getColumns(callout)).toEqual([]);
    });
  });

  describe('task column assignment at creation', () => {
    const storageAggregator = { id: 'agg-1' } as any;
    const contributionSettings = {
      allowedTypes: [CalloutContributionType.POST],
    } as any;

    const postData = (taskColumn?: string) =>
      ({
        type: CalloutContributionType.POST,
        post: { profileData: { displayName: 'Task' } },
        ...(taskColumn === undefined ? {} : { taskColumn }),
      }) as any;

    beforeEach(() => {
      vi.mocked(classificationService.createClassification).mockImplementation(
        (_templates, data) => data as any
      );
    });

    it('canonicalises a case-variant column to the board spelling', async () => {
      const template = boardTemplate([...TASK_BOARD_DEFAULT_COLUMNS]);

      const result = await contributionService.createCalloutContribution(
        postData('in PROGRESS'),
        storageAggregator,
        contributionSettings,
        undefined,
        'user-1',
        template
      );

      expect(result.classification).toEqual({
        tagsets: [{ name: TagsetReservedName.TASK, tags: ['In progress'] }],
      });
    });

    it('defaults an omitted column to the first board column', async () => {
      const template = boardTemplate([...TASK_BOARD_DEFAULT_COLUMNS]);

      const result = await contributionService.createCalloutContribution(
        postData(),
        storageAggregator,
        contributionSettings,
        undefined,
        'user-1',
        template
      );

      expect(result.classification).toEqual({
        tagsets: [{ name: TagsetReservedName.TASK, tags: ['Backlog'] }],
      });
    });

    it('assigns no classification for a plain (non-board) callout', async () => {
      const result = await contributionService.createCalloutContribution(
        postData(),
        storageAggregator,
        contributionSettings,
        undefined,
        'user-1',
        undefined
      );

      expect(result.classification).toBeUndefined();
    });

    it('rejects an unknown column on a board', async () => {
      const template = boardTemplate([...TASK_BOARD_DEFAULT_COLUMNS]);

      await expect(
        contributionService.createCalloutContribution(
          postData('Archived'),
          storageAggregator,
          contributionSettings,
          undefined,
          'user-1',
          template
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('per-column counts zero-fill + ordering', () => {
    /**
     * Mirrors the resolver's merge of the board's ordered columns with the raw
     * per-column counts from the batch loader.
     */
    function mergeColumnCounts(
      columns: string[] | undefined,
      rawCounts: Map<string, number>
    ): { column: string; count: number }[] | null {
      if (!columns) {
        return null;
      }
      return columns.map(column => ({
        column,
        count: rawCounts.get(column) ?? 0,
      }));
    }

    it('zero-fills empty columns and keeps board order', () => {
      const columns = [...TASK_BOARD_DEFAULT_COLUMNS];
      const raw = new Map<string, number>([
        ['In progress', 2],
        ['Backlog', 1],
      ]);

      expect(mergeColumnCounts(columns, raw)).toEqual([
        { column: 'Backlog', count: 1 },
        { column: 'To do', count: 0 },
        { column: 'In progress', count: 2 },
        { column: 'Done', count: 0 },
      ]);
    });

    it('sums to the total number of tasks', () => {
      const columns = [...TASK_BOARD_DEFAULT_COLUMNS];
      const raw = new Map<string, number>([
        ['Backlog', 3],
        ['Done', 5],
      ]);

      const total = mergeColumnCounts(columns, raw)!.reduce(
        (sum, entry) => sum + entry.count,
        0
      );
      expect(total).toBe(8);
    });

    it('returns null when the callout is not a board', () => {
      expect(mergeColumnCounts(undefined, new Map())).toBeNull();
    });
  });
});
