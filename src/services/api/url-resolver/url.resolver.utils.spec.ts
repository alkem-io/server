import {
  createPathFromElements,
  getMatchedResultAsPath,
  getMatchedResultAsString,
  getPath,
  getPathElements,
} from './url.resolver.utils';

describe('getPathElements', () => {
  it('should extract path elements from URL', () => {
    expect(getPathElements('https://example.com/a/b/c')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('should return empty array for root path', () => {
    expect(getPathElements('https://example.com/')).toEqual([]);
  });

  it('should handle URL with query parameters', () => {
    expect(getPathElements('https://example.com/a/b?q=1')).toEqual(['a', 'b']);
  });

  it('should handle single path element', () => {
    expect(getPathElements('https://example.com/spaces')).toEqual(['spaces']);
  });
});

describe('getPath', () => {
  it('should extract pathname from URL', () => {
    expect(getPath('https://example.com/a/b/c')).toBe('/a/b/c');
  });

  it('should return / for root path', () => {
    expect(getPath('https://example.com/')).toBe('/');
  });

  it('should exclude query parameters', () => {
    expect(getPath('https://example.com/a?q=1')).toBe('/a');
  });
});

describe('getMatchedResultAsString', () => {
  it('should return undefined for undefined input', () => {
    expect(getMatchedResultAsString(undefined)).toBeUndefined();
  });

  it('should return string as-is', () => {
    expect(getMatchedResultAsString('test')).toBe('test');
  });

  it('should return first element of array', () => {
    expect(getMatchedResultAsString(['first', 'second'])).toBe('first');
  });
});

describe('getMatchedResultAsPath', () => {
  it('should return undefined for undefined input', () => {
    expect(getMatchedResultAsPath(undefined)).toBeUndefined();
  });

  it('should return string with leading slash', () => {
    expect(getMatchedResultAsPath('test')).toBe('/test');
  });

  it('should join array elements as path', () => {
    expect(getMatchedResultAsPath(['a', 'b', 'c'])).toBe('/a/b/c');
  });
});

describe('createPathFromElements', () => {
  it('should join elements with slashes', () => {
    expect(createPathFromElements(['a', 'b', 'c'])).toBe('/a/b/c');
  });

  it('should return / for empty array', () => {
    expect(createPathFromElements([])).toBe('/');
  });

  it('should handle single element', () => {
    expect(createPathFromElements(['spaces'])).toBe('/spaces');
  });
});
