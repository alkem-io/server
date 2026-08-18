import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import {
  deriveClassificationValueIds,
  deriveClassificationValueIdsForEdit,
  slugifyLabel,
} from './slugify.value.id';

describe('slugifyLabel', () => {
  it('slugifies a label with punctuation and accents into a dashed lowercase id', () => {
    expect(slugifyLabel('13 · Climate Action')).toEqual('13-climate-action');
  });

  it('folds diacritics before deriving', () => {
    expect(slugifyLabel('Café Society')).toEqual('cafe-society');
  });
});

describe('deriveClassificationValueIds', () => {
  it('derives an id from the label when none is supplied', () => {
    const derived = deriveClassificationValueIds([
      { label: '13 · Climate Action' },
    ]);
    expect(derived).toEqual([
      { id: '13-climate-action', label: '13 · Climate Action' },
    ]);
  });

  it('suffixes deterministically on a derived-id collision within the set', () => {
    const derived = deriveClassificationValueIds([
      { label: 'Dutch' },
      { label: 'Dutch' },
      { label: 'Dutch' },
    ]);
    expect(derived.map(v => v.id)).toEqual(['dutch', 'dutch-2', 'dutch-3']);
  });

  it('never re-derives an id once set — a later relabel is a caller concern, not this function', () => {
    // Simulates "derive once, at authoring time": calling again with a
    // renamed label but the previously-derived id supplied explicitly keeps
    // that id, proving derivation only ever happens when the id is absent.
    const first = deriveClassificationValueIds([{ label: 'Dutch' }]);
    const renamed = deriveClassificationValueIds([
      { id: first[0].id, label: 'Nederlands' },
    ]);
    expect(renamed[0].id).toEqual('dutch');
    expect(renamed[0].label).toEqual('Nederlands');
  });

  it('takes an explicit id override verbatim, with no charset restriction', () => {
    const derived = deriveClassificationValueIds([
      { id: 'urn:vng:sector:zorg', label: 'Zorg' },
    ]);
    expect(derived[0].id).toEqual('urn:vng:sector:zorg');
  });

  it('rejects an explicit id that collides within the set, rather than silently suffixing', () => {
    expect(() =>
      deriveClassificationValueIds([
        { id: 'dutch', label: 'Dutch' },
        { id: 'dutch', label: 'Nederlands' },
      ])
    ).toThrow(ValidationException);
  });

  it('rejects an explicit id that colludes with a later derived id, in either order', () => {
    expect(() =>
      deriveClassificationValueIds([
        { label: 'Dutch' },
        { id: 'dutch', label: 'Nederlands' },
      ])
    ).toThrow(ValidationException);
  });

  describe('non-Latin labels never derive an empty id', () => {
    it('derives a non-empty id for a Cyrillic-only label', () => {
      const derived = deriveClassificationValueIds([{ label: 'Здоровье' }]);
      expect(derived[0].id).not.toEqual('');
      expect(derived[0].id.length).toBeGreaterThan(0);
    });

    it('derives distinct non-empty ids for a set of Cyrillic labels, never colliding into the empty-id suffix chain', () => {
      const derived = deriveClassificationValueIds([
        { label: 'Здоровье' },
        { label: 'Образование' },
        { label: 'Технологии' },
      ]);
      const ids = derived.map(v => v.id);
      expect(ids.every(id => id.length > 0)).toBe(true);
      expect(new Set(ids).size).toEqual(3);
    });

    it('derives a non-empty id for a punctuation-only label', () => {
      const derived = deriveClassificationValueIds([{ label: '· · ·' }]);
      expect(derived[0].id.length).toBeGreaterThan(0);
    });

    it('derives a non-empty id for an empty label', () => {
      const derived = deriveClassificationValueIds([{ label: '' }]);
      expect(derived[0].id).toEqual('value');
    });

    it('derives a non-empty id for a CJK label', () => {
      const derived = deriveClassificationValueIds([{ label: '教育' }]);
      expect(derived[0].id.length).toBeGreaterThan(0);
    });
  });
});

describe('deriveClassificationValueIdsForEdit', () => {
  it('carries the existing id forward positionally when the incoming value omits it, even on a relabel', () => {
    const existing = [{ id: 'dutch', label: 'Dutch' }];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: 'Nederlands' },
    ]);
    expect(edited).toEqual([{ id: 'dutch', label: 'Nederlands' }]);
  });

  it('derives a fresh id only for a value beyond the previous length', () => {
    const existing = [{ id: 'dutch', label: 'Dutch' }];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: 'Nederlands' },
      { label: 'French' },
    ]);
    expect(edited).toEqual([
      { id: 'dutch', label: 'Nederlands' },
      { id: 'french', label: 'French' },
    ]);
  });

  it('an explicit id on the incoming value still wins over positional carry-forward', () => {
    const existing = [{ id: 'dutch', label: 'Dutch' }];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { id: 'nl', label: 'Nederlands' },
    ]);
    expect(edited).toEqual([{ id: 'nl', label: 'Nederlands' }]);
  });
});
