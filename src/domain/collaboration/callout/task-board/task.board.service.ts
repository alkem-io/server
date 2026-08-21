import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { getSelectableValues } from '@domain/common/tagset-template/tagset.template.utils';
import { Injectable } from '@nestjs/common';

/**
 * Pure column-model logic for a Tasks board: detecting whether a callout is a
 * board, reading its ordered columns, and validating a column name. Holds no
 * database dependency so the rules stay unit-testable and every write path
 * shares one definition of "valid column".
 */
@Injectable()
export class TaskBoardService {
  /**
   * The reserved tagset that both marks a callout as a Tasks board and, when
   * present on a contribution, names that task's column.
   */
  public getTaskTagset(callout: ICallout): ITagset | undefined {
    return callout.classification?.tagsets?.find(
      tagset => tagset.name === TagsetReservedName.TASK
    );
  }

  /**
   * A callout is a Tasks board exactly when its classification carries the
   * reserved 'task' tagset. No separate content-type flag is stored.
   */
  public isTaskBoard(callout: ICallout): boolean {
    return this.getTaskTagset(callout) !== undefined;
  }

  /**
   * The board's ordered columns, taken from the driving TagsetTemplate's
   * allowedValues. Empty when the callout is not a board or the marker tagset
   * has no template. Empty strings are dropped because a simple-array column
   * persisted from an empty array reads back as `['']`.
   */
  public getColumns(callout: ICallout): string[] {
    const tagset = this.getTaskTagset(callout);
    return getSelectableValues(tagset?.tagsetTemplate?.allowedValues);
  }

  /**
   * The first column is the board's default: new tasks land here and deleting
   * a column reflows its tasks here. It can never be deleted.
   */
  public getDefaultColumn(callout: ICallout): string | undefined {
    return this.getColumns(callout)[0];
  }

  /**
   * Returns the board's canonical spelling of `column` when it exists,
   * otherwise undefined. Case-insensitive so a client that differs only in
   * casing still resolves to the stored column.
   */
  public matchColumn(callout: ICallout, column: string): string | undefined {
    const needle = column.trim().toLowerCase();
    return this.getColumns(callout).find(
      allowed => allowed.toLowerCase() === needle
    );
  }

  /**
   * Validates a single column name against the rules every edit path shares:
   * non-empty after trimming, at most SMALL_TEXT_LENGTH characters, no comma
   * (allowedValues is a comma-joined simple-array column), and case-insensitively
   * distinct from every already-accepted name. Returns the trimmed, canonical
   * spelling to store.
   *
   * @param candidate the incoming column name
   * @param existing the names already accepted on this board (excluding, on a
   *   rename, the column being renamed) — used for the uniqueness check
   */
  public validateColumnName(candidate: string, existing: string[]): string {
    const trimmed = candidate?.trim() ?? '';

    if (trimmed.length === 0) {
      throw new ValidationException(
        'A task board column name cannot be empty',
        LogContext.COLLABORATION
      );
    }

    if (trimmed.length > SMALL_TEXT_LENGTH) {
      throw new ValidationException(
        'A task board column name is too long',
        LogContext.COLLABORATION,
        { length: trimmed.length, max: SMALL_TEXT_LENGTH }
      );
    }

    if (trimmed.includes(',')) {
      throw new ValidationException(
        'A task board column name cannot contain a comma',
        LogContext.COLLABORATION
      );
    }

    const normalized = trimmed.toLowerCase();
    const collides = existing.some(
      name => name.trim().toLowerCase() === normalized
    );
    if (collides) {
      throw new ValidationException(
        'A task board column with this name already exists',
        LogContext.COLLABORATION,
        { column: trimmed }
      );
    }

    return trimmed;
  }

  /**
   * Validates and canonicalises a full ordered list of column names, applying
   * {@link validateColumnName} left to right so later entries are checked for
   * uniqueness against the ones already accepted. The list must be non-empty:
   * a board always keeps at least its default column.
   */
  public validateColumnNames(candidates: string[]): string[] {
    if (!candidates || candidates.length === 0) {
      throw new ValidationException(
        'A task board must keep at least one column',
        LogContext.COLLABORATION
      );
    }

    const accepted: string[] = [];
    for (const candidate of candidates) {
      accepted.push(this.validateColumnName(candidate, accepted));
    }
    return accepted;
  }
}
