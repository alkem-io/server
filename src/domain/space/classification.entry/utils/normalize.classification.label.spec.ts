import { describe, expect, it } from 'vitest';
import { normalizeClassificationLabel } from './normalize.classification.label';

describe('normalizeClassificationLabel', () => {
  it('treats "SDGs", "sdgs" and "SDGs " as the same normalized value', () => {
    const a = normalizeClassificationLabel('SDGs');
    const b = normalizeClassificationLabel('sdgs');
    const c = normalizeClassificationLabel('SDGs ');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeClassificationLabel('Primary   Sector')).toEqual(
      normalizeClassificationLabel('Primary Sector')
    );
  });

  it('does not mutate — the caller is responsible for keeping the stored label verbatim', () => {
    const input = 'SDGs ';
    normalizeClassificationLabel(input);
    expect(input).toEqual('SDGs ');
  });
});
