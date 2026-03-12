import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import {
  parseSearchCursor,
  tryParseSearchCursor,
} from './try.parse.search.cursor';

describe('tryParseSearchCursor', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should parse a valid cursor', () => {
    const result = tryParseSearchCursor(`10.5::${validUUID}`);
    expect(result).toEqual({ score: 10.5, id: validUUID });
  });

  it('should throw on empty cursor', () => {
    expect(() => tryParseSearchCursor('')).toThrow(BaseExceptionInternal);
  });

  it('should throw when score is not a number', () => {
    expect(() => tryParseSearchCursor(`abc::${validUUID}`)).toThrow(
      BaseExceptionInternal
    );
  });

  it('should throw when id is not a UUID', () => {
    expect(() => tryParseSearchCursor('10::not-a-uuid')).toThrow(
      BaseExceptionInternal
    );
  });

  it('should throw when id is empty', () => {
    expect(() => tryParseSearchCursor('10::')).toThrow(BaseExceptionInternal);
  });

  it('should handle integer scores', () => {
    const result = tryParseSearchCursor(`42::${validUUID}`);
    expect(result).toEqual({ score: 42, id: validUUID });
  });
});

describe('parseSearchCursor', () => {
  it('should parse cursor into score and id', () => {
    const result = parseSearchCursor('10.5::some-id');
    expect(result).toEqual({ score: 10.5, id: 'some-id' });
  });

  it('should return NaN score for non-numeric score', () => {
    const result = parseSearchCursor('abc::some-id');
    expect(result.score).toBeNaN();
    expect(result.id).toBe('some-id');
  });

  it('should handle missing id', () => {
    const result = parseSearchCursor('10::');
    expect(result.score).toBe(10);
    expect(result.id).toBe('');
  });
});
