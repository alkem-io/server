import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { TaskBoardMoveService } from './task.board.move.service';
import { TaskBoardService } from './task.board.service';

const COLUMNS = ['Backlog', 'To do', 'In progress', 'Done'];

/**
 * Builds a board contribution whose parent callout drives the given columns and
 * whose marker tagset currently sits in `currentColumn`.
 */
function boardContribution(currentColumn: string) {
  return {
    id: 'contrib-1',
    classification: {
      tagsets: [{ id: 'marker-1', name: TagsetReservedName.TASK }],
    },
    callout: {
      id: 'callout-1',
      classification: {
        tagsets: [
          {
            name: TagsetReservedName.TASK,
            tags: [currentColumn],
            tagsetTemplate: { id: 'tmpl-1', allowedValues: COLUMNS },
          },
        ],
      },
    },
  } as any;
}

describe('TaskBoardMoveService', () => {
  let service: TaskBoardMoveService;
  let contributionService: CalloutContributionService;
  let entityManager: { transaction: ReturnType<typeof vi.fn> };
  let managerFindOne: ReturnType<typeof vi.fn>;
  let managerSave: ReturnType<typeof vi.fn>;
  let markerRow: { id: string; tags: string[] };

  beforeEach(async () => {
    vi.restoreAllMocks();

    markerRow = { id: 'marker-1', tags: ['Backlog'] };
    managerSave = vi.fn(async (row: any) => row);
    managerFindOne = vi.fn(async (entity: any) => {
      if (entity === TagsetTemplate) {
        return { id: 'tmpl-1', allowedValues: COLUMNS };
      }
      if (entity === Tagset) {
        return markerRow;
      }
      return null;
    });

    const manager = { findOne: managerFindOne, save: managerSave };
    entityManager = {
      transaction: vi.fn(async (cb: any) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskBoardMoveService,
        TaskBoardService,
        {
          provide: CalloutContributionService,
          useValue: { getCalloutContributionOrFail: vi.fn() },
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
      ],
    }).compile();

    service = module.get(TaskBoardMoveService);
    contributionService = module.get(CalloutContributionService);
  });

  it('normalises a case-variant column to the canonical spelling', async () => {
    markerRow.tags = ['Backlog'];
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue(boardContribution('Backlog'));

    await service.moveTaskToColumn('contrib-1', 'in PROGRESS');

    expect(managerSave).toHaveBeenCalledTimes(1);
    expect(markerRow.tags).toEqual(['In progress']);
  });

  it('is a no-op when the task already sits in the target column', async () => {
    markerRow.tags = ['To do'];
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue(boardContribution('To do'));

    await service.moveTaskToColumn('contrib-1', 'To do');

    expect(managerSave).not.toHaveBeenCalled();
  });

  it('rejects an unknown column', async () => {
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue(boardContribution('Backlog'));

    await expect(
      service.moveTaskToColumn('contrib-1', 'Archived')
    ).rejects.toThrow(ValidationException);
    expect(managerSave).not.toHaveBeenCalled();
  });

  it('rejects a contribution that is not on a board', async () => {
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue({
      id: 'contrib-1',
      callout: {
        id: 'callout-1',
        classification: { tagsets: [{ name: 'default', tags: [] }] },
      },
    } as any);

    await expect(
      service.moveTaskToColumn('contrib-1', 'To do')
    ).rejects.toThrow(ValidationException);
    expect(entityManager.transaction).not.toHaveBeenCalled();
  });

  it('locks the template row before validating the target column', async () => {
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue(boardContribution('Backlog'));

    await service.moveTaskToColumn('contrib-1', 'Done');

    expect(managerFindOne).toHaveBeenCalledWith(
      TagsetTemplate,
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      })
    );
  });
});
