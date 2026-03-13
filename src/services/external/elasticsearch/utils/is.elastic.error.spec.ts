import { isElasticError } from './is.elastic.error';

describe('isElasticError', () => {
  it('should return true for a valid ErrorResponseBase-like object', () => {
    const error = {
      status: 400,
      error: { type: 'index_not_found_exception' },
    };
    expect(isElasticError(error)).toBe(true);
  });

  it('should return false when status is missing', () => {
    const error = {
      error: { type: 'index_not_found_exception' },
    };
    expect(isElasticError(error)).toBe(false);
  });

  it('should return false when error property is missing', () => {
    const error = { status: 400 };
    expect(isElasticError(error)).toBe(false);
  });

  it('should return false when error.type is missing', () => {
    const error = { status: 400, error: {} };
    expect(isElasticError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isElasticError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isElasticError(undefined)).toBe(false);
  });

  it('should return false for a plain string', () => {
    expect(isElasticError('some error')).toBe(false);
  });
});
