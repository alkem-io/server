import {
  parseSearchCursor,
  tryParseSearchCursor,
} from './try.parse.search.cursor';

describe('tryParseSearchCursor', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should parse a valid cursor', () => {
    const cursor = `5.5::${VALID_UUID}`;
    const result = tryParseSearchCursor(cursor);
    expect(result).toEqual({ score: 5.5, id: VALID_UUID });
  });

  it('should throw for an empty string', () => {
    expect(() => tryParseSearchCursor('')).toThrow('Invalid search cursor');
  });

  it('should throw when score is NaN', () => {
    const cursor = `abc::${VALID_UUID}`;
    expect(() => tryParseSearchCursor(cursor)).toThrow(
      'Invalid first part of cursor'
    );
  });

  it('should throw when id is missing', () => {
    const cursor = '5.5::';
    expect(() => tryParseSearchCursor(cursor)).toThrow(
      'Invalid second part of cursor'
    );
  });

  it('should throw when id is not a valid UUID', () => {
    const cursor = '5.5::not-a-uuid';
    expect(() => tryParseSearchCursor(cursor)).toThrow(
      'Invalid second part of cursor'
    );
  });

  it('should handle integer scores', () => {
    const cursor = `10::${VALID_UUID}`;
    const result = tryParseSearchCursor(cursor);
    expect(result.score).toBe(10);
  });

  it('should handle zero score', () => {
    const cursor = `0::${VALID_UUID}`;
    const result = tryParseSearchCursor(cursor);
    expect(result.score).toBe(0);
  });
});

describe('parseSearchCursor', () => {
  it('should parse score and id from a cursor string', () => {
    const cursor = '7.2::some-id-value';
    const result = parseSearchCursor(cursor);
    expect(result).toEqual({ score: 7.2, id: 'some-id-value' });
  });

  it('should return NaN score for non-numeric score part', () => {
    const result = parseSearchCursor('abc::id');
    expect(Number.isNaN(result.score)).toBe(true);
    expect(result.id).toBe('id');
  });

  it('should handle cursor with no separator', () => {
    const result = parseSearchCursor('noseparator');
    expect(Number.isNaN(result.score)).toBe(true);
    expect(result.id).toBeUndefined();
  });
});
