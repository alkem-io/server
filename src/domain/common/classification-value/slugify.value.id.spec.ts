import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import { deriveClassificationValueIds, slugifyLabel } from './slugify.value.id';

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
});
