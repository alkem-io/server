import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { TaskBoardService } from './task.board.service';

const oversizedName = 'x'.repeat(129);

/**
 * Builds a minimal callout carrying (or not) the reserved task tagset with the
 * given ordered columns. Only the fields the service reads are populated.
 */
const calloutWithColumns = (columns?: string[]): ICallout => {
  const tagsets = columns
    ? [
        {
          name: TagsetReservedName.TASK,
          tags: [],
          tagsetTemplate: { allowedValues: columns },
        },
      ]
    : [];
  return { classification: { tagsets } } as unknown as ICallout;
};

describe('TaskBoardService', () => {
  const service = new TaskBoardService();

  describe('board detection', () => {
    it('detects a callout carrying the reserved task tagset', () => {
      const callout = calloutWithColumns(['Backlog', 'Done']);
      expect(service.isTaskBoard(callout)).toBe(true);
      expect(service.getTaskTagset(callout)?.name).toBe(
        TagsetReservedName.TASK
      );
    });

    it('reports a callout without the task tagset as not a board', () => {
      const callout = calloutWithColumns();
      expect(service.isTaskBoard(callout)).toBe(false);
      expect(service.getTaskTagset(callout)).toBeUndefined();
    });

    it('treats a callout with no classification as not a board', () => {
      expect(service.isTaskBoard({} as ICallout)).toBe(false);
    });
  });

  describe('columns', () => {
    it('reads the ordered columns from the driving template', () => {
      const callout = calloutWithColumns(['Backlog', 'To do', 'Done']);
      expect(service.getColumns(callout)).toEqual(['Backlog', 'To do', 'Done']);
      expect(service.getDefaultColumn(callout)).toBe('Backlog');
    });

    it('drops the empty-string artefact of an emptied simple-array', () => {
      expect(service.getColumns(calloutWithColumns(['']))).toEqual([]);
    });

    it('returns no columns for a non-board callout', () => {
      expect(service.getColumns(calloutWithColumns())).toEqual([]);
      expect(service.getDefaultColumn(calloutWithColumns())).toBeUndefined();
    });

    it('matches a column case-insensitively and returns the canonical spelling', () => {
      const callout = calloutWithColumns(['Backlog', 'In progress']);
      expect(service.matchColumn(callout, 'in PROGRESS')).toBe('In progress');
      expect(service.matchColumn(callout, '  backlog ')).toBe('Backlog');
      expect(service.matchColumn(callout, 'nope')).toBeUndefined();
    });
  });

  describe('validateColumnName', () => {
    it('accepts a valid name and returns it trimmed', () => {
      expect(service.validateColumnName('  Review  ', ['Backlog'])).toBe(
        'Review'
      );
    });

    it('rejects an empty or whitespace-only name', () => {
      expect(() => service.validateColumnName('', [])).toThrow(
        ValidationException
      );
      expect(() => service.validateColumnName('   ', [])).toThrow(
        ValidationException
      );
    });

    it('rejects a name longer than the small-text limit', () => {
      expect(() => service.validateColumnName(oversizedName, [])).toThrow(
        ValidationException
      );
    });

    it('rejects a name containing a comma', () => {
      expect(() => service.validateColumnName('a,b', [])).toThrow(
        ValidationException
      );
    });

    it('rejects a case-insensitive duplicate of an existing name', () => {
      expect(() => service.validateColumnName('backlog', ['Backlog'])).toThrow(
        ValidationException
      );
    });
  });

  describe('validateColumnNames', () => {
    it('canonicalises a valid ordered list', () => {
      expect(
        service.validateColumnNames(['  Backlog', 'To do ', 'Done'])
      ).toEqual(['Backlog', 'To do', 'Done']);
    });

    it('rejects an empty list', () => {
      expect(() => service.validateColumnNames([])).toThrow(
        ValidationException
      );
    });

    it('rejects a list with a case-insensitive duplicate', () => {
      expect(() => service.validateColumnNames(['Backlog', 'BACKLOG'])).toThrow(
        ValidationException
      );
    });
  });
});
