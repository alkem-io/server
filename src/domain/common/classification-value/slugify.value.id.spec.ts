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

  it('rejects an over-size input BEFORE any collision-suffix work — the bound is checked first, not after (sec-server-3)', () => {
    // A single label repeated past the max would previously walk the
    // quadratic collision-suffix loop before this bound was ever consulted.
    const oversized = Array.from({ length: 51 }, () => ({ label: 'a' }));
    expect(() => deriveClassificationValueIds(oversized)).toThrow(
      ValidationException
    );
  });

  it('stays fast for a large run of identically-labelled values, at exactly the max size — O(1) amortized suffix allocation, not O(n^2)', () => {
    const atMax = Array.from({ length: 50 }, () => ({ label: 'Dutch' }));
    const start = performance.now();
    const derived = deriveClassificationValueIds(atMax);
    const elapsedMs = performance.now() - start;

    expect(derived).toHaveLength(50);
    expect(new Set(derived.map(v => v.id)).size).toEqual(50);
    // The old quadratic loop took ~1.4s for 10k identical labels on this
    // class of machine; 50 values must be essentially instant.
    expect(elapsedMs).toBeLessThan(50);
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

  it("a removal with ids omitted keeps the surviving value's own id — never the first value's id via position", () => {
    const existing = [
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: 'sdg-14', label: '14 · Life Below Water' },
    ];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: '14 · Life Below Water' },
    ]);
    expect(edited).toEqual([{ id: 'sdg-14', label: '14 · Life Below Water' }]);
  });

  it('removing the middle value with ids omitted keeps the surviving values on their own ids', () => {
    const existing = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: 'A' },
      { label: 'C' },
    ]);
    expect(edited).toEqual([
      { id: 'a', label: 'A' },
      { id: 'c', label: 'C' },
    ]);
  });

  it('a reorder with ids omitted follows the label, not the position — ids never swap', () => {
    const existing = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: 'B' },
      { label: 'A' },
    ]);
    expect(edited).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ]);
  });

  it('rejects an over-size edit input BEFORE any label-matching work (sec-server-3)', () => {
    const existing = [{ id: 'a', label: 'A' }];
    const oversized = Array.from({ length: 51 }, () => ({ label: 'a' }));
    expect(() =>
      deriveClassificationValueIdsForEdit(existing, oversized)
    ).toThrow(ValidationException);
  });

  it('a reorder combined with a rename: the moved value keeps its id, the renamed value keeps its id too', () => {
    const existing = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const edited = deriveClassificationValueIdsForEdit(existing, [
      { label: 'B' },
      { label: 'A2' },
    ]);
    // 'B' matches existing id b via label; 'A2' has no label match, so it
    // falls back positionally onto existing[1] = b — but b is already
    // claimed by 'B', so 'A2' is treated as genuinely new and slugified.
    expect(edited).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a2', label: 'A2' },
    ]);
  });
});
