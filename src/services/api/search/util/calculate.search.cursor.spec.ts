import { calculateSearchCursor } from './calculate.search.cursor';

describe('calculateSearchCursor', () => {
  it('should return undefined for empty array', () => {
    expect(calculateSearchCursor([])).toBeUndefined();
  });

  it('should return cursor from last element', () => {
    const results = [
      { score: 10, result: { id: 'aaa' } },
      { score: 5, result: { id: 'bbb' } },
    ] as any;
    expect(calculateSearchCursor(results)).toBe('5::bbb');
  });

  it('should return cursor for single element array', () => {
    const results = [{ score: 7.5, result: { id: 'ccc' } }] as any;
    expect(calculateSearchCursor(results)).toBe('7.5::ccc');
  });

  it('should handle score of 0', () => {
    const results = [{ score: 0, result: { id: 'ddd' } }] as any;
    expect(calculateSearchCursor(results)).toBe('0::ddd');
  });
});
