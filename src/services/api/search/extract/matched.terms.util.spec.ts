import {
  decodeTermNames,
  encodeTermName,
  MAX_NAMED_TERMS,
  tokenizeQuery,
} from './matched.terms.util';

describe('matched.terms.util', () => {
  describe('tokenizeQuery', () => {
    it('splits on whitespace preserving order', () => {
      expect(tokenizeQuery('alpha beta gamma')).toEqual([
        'alpha',
        'beta',
        'gamma',
      ]);
    });

    it('returns [] for an empty string', () => {
      expect(tokenizeQuery('')).toEqual([]);
    });

    it('returns [] for a whitespace-only string', () => {
      expect(tokenizeQuery('   \t  \n ')).toEqual([]);
    });

    it('collapses runs of whitespace', () => {
      expect(tokenizeQuery('  alpha   beta  ')).toEqual(['alpha', 'beta']);
    });

    it('de-duplicates case-insensitively keeping first-seen form', () => {
      expect(tokenizeQuery('Dev dev DEV ops')).toEqual(['Dev', 'ops']);
    });
  });

  describe('encode/decode round-trip', () => {
    it('decodes the names of all matched tokens back in query order', () => {
      const tokens = tokenizeQuery('governance memo whiteboard');
      const names = tokens.map((_, i) => encodeTermName(i));

      expect(decodeTermNames(names, tokens)).toEqual([
        'governance',
        'memo',
        'whiteboard',
      ]);
    });

    it('returns only the subset of tokens whose names matched', () => {
      const tokens = tokenizeQuery('governance memo whiteboard');
      // only the first and third clause matched
      const matched = [encodeTermName(2), encodeTermName(0)];

      expect(decodeTermNames(matched, tokens)).toEqual([
        'governance',
        'whiteboard',
      ]);
    });

    it('preserves query order regardless of the order ES reports names', () => {
      const tokens = tokenizeQuery('alpha beta gamma');
      const matched = [encodeTermName(2), encodeTermName(0), encodeTermName(1)];

      expect(decodeTermNames(matched, tokens)).toEqual([
        'alpha',
        'beta',
        'gamma',
      ]);
    });
  });

  describe('decodeTermNames edge cases', () => {
    it('returns [] for empty matched_queries', () => {
      expect(decodeTermNames([], ['alpha'])).toEqual([]);
    });

    it('returns [] for undefined matched_queries', () => {
      expect(decodeTermNames(undefined, ['alpha'])).toEqual([]);
    });

    it('ignores foreign / unknown clause names', () => {
      const tokens = tokenizeQuery('alpha beta');
      expect(
        decodeTermNames(
          [encodeTermName(0), 'flowState_scope', 'term_99'],
          tokens
        )
      ).toEqual(['alpha']);
    });

    it('de-duplicates case-insensitively on decode', () => {
      // hand-crafted ordered tokens with a duplicate (defensive: tokenizeQuery
      // would already dedupe, but decode must not leak a duplicate)
      const tokens = ['Dev', 'ops', 'dev'];
      const matched = [encodeTermName(0), encodeTermName(2), encodeTermName(1)];
      expect(decodeTermNames(matched, tokens)).toEqual(['Dev', 'ops']);
    });
  });

  describe('MAX_NAMED_TERMS', () => {
    it('is a sane defensive cap', () => {
      expect(MAX_NAMED_TERMS).toBeGreaterThan(0);
      expect(MAX_NAMED_TERMS).toBeLessThanOrEqual(100);
    });
  });
});
