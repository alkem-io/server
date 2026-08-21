import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import {
  CLASSIFICATION_VALUE_SET_MAX_SIZE,
  CLASSIFICATION_VALUE_SET_MIN_SIZE,
  IClassificationValue,
} from '@domain/common/classification-value/classification.value.interface';
import { normalizeClassificationLabel } from './utils/normalize.classification.label';

/**
 * The single home for invariants I-1…I-7 (data-model.md §1). I-4 and I-7
 * live here together deliberately (R-6): narrowing cardinality while >1
 * value is selected is REJECTED (the server never picks a survivor), while
 * removing a value from the value set during a definition edit
 * AUTO-DESELECTS it (unambiguous — the value is gone). Keeping the contrast
 * in one file is what stops the two rules drifting apart.
 *
 * I-8 (sortOrder allocation) is not here — it is an allocation, not a
 * validation, and lives in ClassificationEntryService. I-9 (the
 * Template-side pair) lives in TemplateService, next to the columns it
 * constrains. I-10 (host scope) is not a runtime guard at all under D1 — see
 * classification.entry.service.ts.
 *
 * No dependency injection: every method is pure, given its inputs.
 */
export class ClassificationEntryValidator {
  static readonly MIN_VALUES = CLASSIFICATION_VALUE_SET_MIN_SIZE;
  static readonly MAX_VALUES = CLASSIFICATION_VALUE_SET_MAX_SIZE;

  // I-1, I-2 — size bound and within-set id uniqueness. Order (I-6) is
  // never checked here because nothing in this module may reorder it; there
  // is simply no sort call anywhere on the write path.
  static validateValueSet(valueSet: IClassificationValue[]): void {
    if (
      valueSet.length < ClassificationEntryValidator.MIN_VALUES ||
      valueSet.length > ClassificationEntryValidator.MAX_VALUES
    ) {
      throw new ValidationException(
        `A Classification value set must contain between ${ClassificationEntryValidator.MIN_VALUES} and ${ClassificationEntryValidator.MAX_VALUES} values`,
        LogContext.CLASSIFICATION,
        { size: valueSet.length }
      );
    }

    const seen = new Set<string>();
    for (const value of valueSet) {
      if (!value.id) {
        throw new ValidationException(
          'Classification value ids must not be empty',
          LogContext.CLASSIFICATION,
          { label: value.label }
        );
      }
      if (seen.has(value.id)) {
        throw new ValidationException(
          'Classification value ids must be unique within the value set',
          LogContext.CLASSIFICATION,
          { duplicateId: value.id }
        );
      }
      // Defence in depth alongside CreateClassificationValueInput's own
      // @MaxLength(SMALL_TEXT_LENGTH): this validator is also reachable from
      // callers that never pass through that DTO's class-validator pipe
      // (bootstrap seeding, a future internal caller), and `label` persists
      // straight into unbounded jsonb re-served on every anonymous read of
      // a public Space's About.
      if (value.label.length > SMALL_TEXT_LENGTH) {
        throw new ValidationException(
          'Classification value label exceeds the maximum length',
          LogContext.CLASSIFICATION,
          { labelLength: value.label.length }
        );
      }
      seen.add(value.id);
    }
  }

  // I-3, I-4 — every id in the proposed selection must exist in the value
  // set, and a SINGLE_SELECT entry may never end up with more than one
  // selected value. Both reject atomically: nothing is applied on failure.
  //
  // A selection can never legitimately contain a duplicate or exceed the
  // value set's own size (a value can only be selected once) — rejecting
  // both here, before the membership/cardinality checks, is defence in
  // depth against a caller that bypasses the DTO's own
  // @ArrayMaxSize(CLASSIFICATION_VALUE_SET_MAX_SIZE): without it, a
  // duplicate-tolerant MULTI_SELECT write can inflate `selectedValueIDs`
  // arbitrarily even though every id it contains is individually valid.
  static validateSelection(
    cardinality: ClassificationCardinality,
    valueSet: IClassificationValue[],
    selectedValueIDs: string[]
  ): void {
    if (selectedValueIDs.length > CLASSIFICATION_VALUE_SET_MAX_SIZE) {
      throw new ValidationException(
        `A Classification selection must contain at most ${CLASSIFICATION_VALUE_SET_MAX_SIZE} values`,
        LogContext.CLASSIFICATION,
        { size: selectedValueIDs.length }
      );
    }
    if (new Set(selectedValueIDs).size !== selectedValueIDs.length) {
      throw new ValidationException(
        'Selection must not contain duplicate value ids',
        LogContext.CLASSIFICATION,
        { size: selectedValueIDs.length }
      );
    }

    const validIds = new Set(valueSet.map(value => value.id));
    const unknownIds = selectedValueIDs.filter(id => !validIds.has(id));
    if (unknownIds.length > 0) {
      throw new ValidationException(
        'Selection contains value id(s) not present in the value set',
        LogContext.CLASSIFICATION,
        // Bounded by the size check above — never the unbounded caller
        // input verbatim, which would turn a rejected request into an
        // oversized log record.
        { unknownIds }
      );
    }

    if (
      cardinality === ClassificationCardinality.SINGLE_SELECT &&
      selectedValueIDs.length > 1
    ) {
      // Safe to embed verbatim here (unlike a hypothetical unbounded
      // caller): the size guard above already caps `selectedValueIDs` at
      // CLASSIFICATION_VALUE_SET_MAX_SIZE by the time this branch runs.
      throw new ValidationException(
        'A single-select Classification may have at most one selected value',
        LogContext.CLASSIFICATION,
        { selectedValueIDs }
      );
    }
  }

  // Display-label shape guard: non-blank and bounded. Defence in depth
  // alongside the DTOs' @MaxLength(SMALL_TEXT_LENGTH): this validator is
  // also reachable from callers that never pass through the class-validator
  // pipe (addFromTemplate copying a template's displayName, bootstrap
  // seeding), and `displayLabel` persists into an unbounded text column
  // re-served on every anonymous read of a public Space's About. Blank
  // labels are rejected here because @MaxLength alone accepts ''.
  static validateDisplayLabel(displayLabel: string): void {
    if (displayLabel.trim().length === 0) {
      throw new ValidationException(
        'A Classification display label must not be empty',
        LogContext.CLASSIFICATION,
        { displayLabelLength: displayLabel.length }
      );
    }
    if (displayLabel.length > SMALL_TEXT_LENGTH) {
      throw new ValidationException(
        'Classification display label exceeds the maximum length',
        LogContext.CLASSIFICATION,
        { displayLabelLength: displayLabel.length }
      );
    }
  }

  // I-5 — the display-label duplicate guard, scoped to the SAME SpaceAbout's
  // other entries, comparing under FR-011c normalization. `excludeEntryID`
  // lets an update compare against every sibling except itself.
  static validateDisplayLabelUnique(
    candidateLabel: string,
    siblingEntries: { id: string; displayLabel: string }[],
    excludeEntryID?: string
  ): void {
    const normalizedCandidate = normalizeClassificationLabel(candidateLabel);
    const collision = siblingEntries.some(
      entry =>
        entry.id !== excludeEntryID &&
        normalizeClassificationLabel(entry.displayLabel) === normalizedCandidate
    );
    if (collision) {
      throw new ValidationException(
        'A Classification with this display label already exists on this Space',
        LogContext.CLASSIFICATION,
        { displayLabel: candidateLabel }
      );
    }
  }

  // I-7 — auto-deselect any currently-selected id that is no longer present
  // in the (possibly narrowed) value set. Unlike I-4, this never rejects:
  // which selection dies is unambiguous when the value itself is gone.
  static autoDeselectRemovedValues(
    selectedValueIDs: string[],
    valueSet: IClassificationValue[]
  ): string[] {
    const validIds = new Set(valueSet.map(value => value.id));
    return selectedValueIDs.filter(id => validIds.has(id));
  }
}
