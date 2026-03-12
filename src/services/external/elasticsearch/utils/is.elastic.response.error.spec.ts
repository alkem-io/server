import { isElasticResponseError } from './is.elastic.response.error';

describe('isElasticResponseError', () => {
  it('should return true for a valid ElasticResponseError-like object', () => {
    const error = {
      meta: { statusCode: { '400': {} } },
      name: 'ResponseError',
      message: 'index_not_found_exception',
      stack: 'Error: ...',
    };
    expect(isElasticResponseError(error)).toBe(true);
  });

  it('should return false when meta is missing', () => {
    const error = {
      name: 'ResponseError',
      message: 'error',
      stack: 'Error: ...',
    };
    expect(isElasticResponseError(error)).toBe(false);
  });

  it('should return false when stack is missing', () => {
    const error = {
      meta: { statusCode: {} },
      name: 'ResponseError',
      message: 'error',
    };
    expect(isElasticResponseError(error)).toBe(false);
  });

  it('should return false when message is missing', () => {
    const error = {
      meta: { statusCode: {} },
      name: 'ResponseError',
      stack: 'Error: ...',
    };
    expect(isElasticResponseError(error)).toBe(false);
  });

  it('should return false for a plain object without required properties', () => {
    expect(isElasticResponseError({})).toBe(false);
  });

  it('should return false for a plain string', () => {
    expect(isElasticResponseError('some error')).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isElasticResponseError(42)).toBe(false);
  });
});
