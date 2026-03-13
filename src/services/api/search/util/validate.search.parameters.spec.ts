import { SearchCategory } from '../search.category';
import { validateSearchParameters } from './validate.search.parameters';

describe('validateSearchParameters', () => {
  const validationOptions = { maxSearchResults: 50 };

  it('should pass with valid parameters', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['hello'],
          filters: [{ category: SearchCategory.SPACES, size: 5 }],
        } as any,
        validationOptions
      )
    ).not.toThrow();
  });

  it('should throw when terms exceed limit', () => {
    const terms = Array.from({ length: 11 }, (_, i) => `term${i}`);
    expect(() =>
      validateSearchParameters({ terms, filters: [] } as any, validationOptions)
    ).toThrow('Maximum number of search terms is 10');
  });

  it('should allow exactly 10 terms', () => {
    const terms = Array.from({ length: 10 }, (_, i) => `term${i}`);
    expect(() =>
      validateSearchParameters({ terms, filters: [] } as any, validationOptions)
    ).not.toThrow();
  });

  it('should throw when tagsetNames exceed limit', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          tagsetNames: ['t1', 't2', 't3'],
          filters: [],
        } as any,
        validationOptions
      )
    ).toThrow('Maximum number of tagset names is 2');
  });

  it('should allow exactly 2 tagset names', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          tagsetNames: ['t1', 't2'],
          filters: [],
        } as any,
        validationOptions
      )
    ).not.toThrow();
  });

  it('should throw when size is negative', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [{ category: SearchCategory.SPACES, size: -1 }],
        } as any,
        validationOptions
      )
    ).toThrow('Size cannot be a negative number');
  });

  it('should throw when total size exceeds max search results', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [
            { category: SearchCategory.SPACES, size: 30 },
            { category: SearchCategory.CONTRIBUTORS, size: 25 },
          ],
        } as any,
        validationOptions
      )
    ).toThrow('cannot exceed the maximum allowed 50');
  });

  it('should allow total size equal to max', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [
            { category: SearchCategory.SPACES, size: 25 },
            { category: SearchCategory.CONTRIBUTORS, size: 25 },
          ],
        } as any,
        validationOptions
      )
    ).not.toThrow();
  });

  it('should pass with no tagsetNames', () => {
    expect(() =>
      validateSearchParameters(
        { terms: ['a'], filters: [] } as any,
        validationOptions
      )
    ).not.toThrow();
  });

  it('should pass with no filters (defaults to empty)', () => {
    expect(() =>
      validateSearchParameters({ terms: ['a'] } as any, validationOptions)
    ).not.toThrow();
  });
});
