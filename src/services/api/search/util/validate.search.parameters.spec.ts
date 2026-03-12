import { ValidationException } from '@common/exceptions';
import { validateSearchParameters } from './validate.search.parameters';

describe('validateSearchParameters', () => {
  const defaultOptions = { maxSearchResults: 100 };

  it('should pass validation with valid parameters', () => {
    expect(() =>
      validateSearchParameters(
        { terms: ['test'], tagsetNames: [], filters: [] } as any,
        defaultOptions
      )
    ).not.toThrow();
  });

  it('should throw when terms exceed the limit of 10', () => {
    const terms = Array.from({ length: 11 }, (_, i) => `term${i}`);
    expect(() =>
      validateSearchParameters({ terms, filters: [] } as any, defaultOptions)
    ).toThrow(ValidationException);
  });

  it('should allow exactly 10 terms', () => {
    const terms = Array.from({ length: 10 }, (_, i) => `term${i}`);
    expect(() =>
      validateSearchParameters({ terms, filters: [] } as any, defaultOptions)
    ).not.toThrow();
  });

  it('should throw when tagsetNames exceed the limit of 2', () => {
    expect(() =>
      validateSearchParameters(
        { terms: ['a'], tagsetNames: ['a', 'b', 'c'], filters: [] } as any,
        defaultOptions
      )
    ).toThrow(ValidationException);
  });

  it('should allow exactly 2 tagsetNames', () => {
    expect(() =>
      validateSearchParameters(
        { terms: ['a'], tagsetNames: ['a', 'b'], filters: [] } as any,
        defaultOptions
      )
    ).not.toThrow();
  });

  it('should throw when filter size is negative', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [{ size: -1, category: 'spaces' }],
        } as any,
        defaultOptions
      )
    ).toThrow(ValidationException);
  });

  it('should throw when total filter sizes exceed maxSearchResults', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [
            { size: 60, category: 'spaces' },
            { size: 50, category: 'contributors' },
          ],
        } as any,
        { maxSearchResults: 100 }
      )
    ).toThrow(ValidationException);
  });

  it('should pass when total filter sizes equal maxSearchResults', () => {
    expect(() =>
      validateSearchParameters(
        {
          terms: ['a'],
          filters: [
            { size: 50, category: 'spaces' },
            { size: 50, category: 'contributors' },
          ],
        } as any,
        { maxSearchResults: 100 }
      )
    ).not.toThrow();
  });

  it('should handle missing filters gracefully', () => {
    expect(() =>
      validateSearchParameters({ terms: ['a'] } as any, defaultOptions)
    ).not.toThrow();
  });

  it('should handle undefined tagsetNames', () => {
    expect(() =>
      validateSearchParameters(
        { terms: ['a'], tagsetNames: undefined, filters: [] } as any,
        defaultOptions
      )
    ).not.toThrow();
  });
});
