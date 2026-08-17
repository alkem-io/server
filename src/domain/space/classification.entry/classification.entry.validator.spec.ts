import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { IClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { describe, expect, it } from 'vitest';
import { ClassificationEntryValidator } from './classification.entry.validator';

const values = (n: number): IClassificationValue[] =>
  Array.from({ length: n }, (_, i) => ({ id: `v${i}`, label: `Value ${i}` }));

describe('ClassificationEntryValidator', () => {
  describe('I-1: value set size bound (1-50)', () => {
    it('rejects an empty value set', () => {
      expect(() => ClassificationEntryValidator.validateValueSet([])).toThrow(
        ValidationException
      );
    });

    it('accepts exactly 1 and exactly 50 values', () => {
      expect(() =>
        ClassificationEntryValidator.validateValueSet(values(1))
      ).not.toThrow();
      expect(() =>
        ClassificationEntryValidator.validateValueSet(values(50))
      ).not.toThrow();
    });

    it('rejects 51 values', () => {
      expect(() =>
        ClassificationEntryValidator.validateValueSet(values(51))
      ).toThrow(ValidationException);
    });
  });

  describe('I-2: value id uniqueness within the set', () => {
    it('rejects a duplicate id', () => {
      expect(() =>
        ClassificationEntryValidator.validateValueSet([
          { id: 'a', label: 'A' },
          { id: 'a', label: 'A again' },
        ])
      ).toThrow(ValidationException);
    });
  });

  describe('I-3: selection must be a subset of the value set', () => {
    it('rejects an unknown selected id', () => {
      expect(() =>
        ClassificationEntryValidator.validateSelection(
          ClassificationCardinality.MULTI_SELECT,
          values(3),
          ['v0', 'bogus']
        )
      ).toThrow(ValidationException);
    });

    it('accepts a fully-known selection, including the empty list', () => {
      expect(() =>
        ClassificationEntryValidator.validateSelection(
          ClassificationCardinality.MULTI_SELECT,
          values(3),
          ['v0', 'v2']
        )
      ).not.toThrow();
      expect(() =>
        ClassificationEntryValidator.validateSelection(
          ClassificationCardinality.MULTI_SELECT,
          values(3),
          []
        )
      ).not.toThrow();
    });
  });

  describe('I-4 vs I-7: narrowing rejects, removal auto-deselects', () => {
    it('I-4: rejects more than one selected value on a SINGLE_SELECT entry, atomically', () => {
      expect(() =>
        ClassificationEntryValidator.validateSelection(
          ClassificationCardinality.SINGLE_SELECT,
          values(3),
          ['v0', 'v1']
        )
      ).toThrow(ValidationException);
    });

    it('I-4: a single selected value is fine on SINGLE_SELECT', () => {
      expect(() =>
        ClassificationEntryValidator.validateSelection(
          ClassificationCardinality.SINGLE_SELECT,
          values(3),
          ['v0']
        )
      ).not.toThrow();
    });

    it('I-7: auto-deselects a removed value without throwing', () => {
      const narrowedValueSet = values(3).filter(v => v.id !== 'v1');
      const result = ClassificationEntryValidator.autoDeselectRemovedValues(
        ['v0', 'v1'],
        narrowedValueSet
      );
      expect(result).toEqual(['v0']);
    });

    it('I-7 never throws, unlike I-4', () => {
      expect(() =>
        ClassificationEntryValidator.autoDeselectRemovedValues(
          ['v0', 'v1', 'v2'],
          []
        )
      ).not.toThrow();
    });
  });

  describe('I-5: display-label uniqueness among the same About entries, normalized', () => {
    const siblings = [{ id: 'existing', displayLabel: 'SDGs' }];

    it('rejects a normalized collision ("sdgs", "SDGs ")', () => {
      expect(() =>
        ClassificationEntryValidator.validateDisplayLabelUnique(
          'sdgs',
          siblings
        )
      ).toThrow(ValidationException);
      expect(() =>
        ClassificationEntryValidator.validateDisplayLabelUnique(
          'SDGs ',
          siblings
        )
      ).toThrow(ValidationException);
    });

    it('accepts a distinct label', () => {
      expect(() =>
        ClassificationEntryValidator.validateDisplayLabelUnique(
          'Sector',
          siblings
        )
      ).not.toThrow();
    });

    it('excludes the entry being updated from the collision check', () => {
      expect(() =>
        ClassificationEntryValidator.validateDisplayLabelUnique(
          'SDGs',
          siblings,
          'existing'
        )
      ).not.toThrow();
    });
  });
});
