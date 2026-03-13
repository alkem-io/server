import { ISearchResult } from '../dto/results';
import { calculateSearchCursor } from './calculate.search.cursor';

describe('calculateSearchCursor', () => {
  it('should return undefined for an empty array', () => {
    expect(calculateSearchCursor([])).toBeUndefined();
  });

  it('should return cursor from the last element', () => {
    const results: ISearchResult[] = [
      {
        id: 'a',
        score: 10,
        type: 'space' as any,
        terms: [],
        result: { id: 'uuid-1' },
      },
      {
        id: 'b',
        score: 5,
        type: 'user' as any,
        terms: [],
        result: { id: 'uuid-2' },
      },
    ];
    expect(calculateSearchCursor(results)).toBe('5::uuid-2');
  });

  it('should handle a single element array', () => {
    const results: ISearchResult[] = [
      {
        id: 'a',
        score: 7.5,
        type: 'space' as any,
        terms: [],
        result: { id: 'uuid-x' },
      },
    ];
    expect(calculateSearchCursor(results)).toBe('7.5::uuid-x');
  });

  it('should handle score of 0', () => {
    const results: ISearchResult[] = [
      {
        id: 'a',
        score: 0,
        type: 'space' as any,
        terms: [],
        result: { id: 'uuid-zero' },
      },
    ];
    expect(calculateSearchCursor(results)).toBe('0::uuid-zero');
  });

  it('should handle negative scores', () => {
    const results: ISearchResult[] = [
      {
        id: 'a',
        score: -1,
        type: 'space' as any,
        terms: [],
        result: { id: 'uuid-neg' },
      },
    ];
    expect(calculateSearchCursor(results)).toBe('-1::uuid-neg');
  });
});
