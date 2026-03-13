import { vi } from 'vitest';
import { handleElasticError } from './handle.elastic.error';

vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

describe('handleElasticError', () => {
  it('should handle an ElasticResponseError', () => {
    const error = {
      meta: { statusCode: { '404': {} } },
      name: 'ResponseError',
      message: 'index_not_found_exception',
      stack: 'Error: ...',
    };

    const result = handleElasticError(error);

    expect(result).toEqual({
      message: 'index_not_found_exception',
      uuid: 'test-uuid-1234',
      name: 'ResponseError',
      status: 404,
    });
  });

  it('should handle an ElasticResponseError with no status keys', () => {
    const error = {
      meta: { statusCode: {} },
      name: 'ResponseError',
      message: 'unknown error',
      stack: 'Error: ...',
    };

    const result = handleElasticError(error);

    expect(result).toEqual({
      message: 'unknown error',
      uuid: 'test-uuid-1234',
      name: 'ResponseError',
      status: -1,
    });
  });

  it('should handle an ErrorResponseBase (elastic error)', () => {
    const error = {
      status: 400,
      error: { type: 'mapper_parsing_exception' },
    };

    const result = handleElasticError(error);

    expect(result).toEqual({
      message: 'mapper_parsing_exception',
      uuid: 'test-uuid-1234',
      name: 'ErrorResponseBase',
      status: 400,
    });
  });

  it('should handle a standard Error', () => {
    const error = new Error('Connection refused');

    const result = handleElasticError(error);

    expect(result).toEqual({
      message: 'Connection refused',
      uuid: 'test-uuid-1234',
      name: 'Error',
    });
  });

  it('should handle a non-Error unknown value', () => {
    const result = handleElasticError('something went wrong');

    expect(result).toEqual({
      message: 'something went wrong',
      uuid: 'test-uuid-1234',
    });
  });

  it('should handle a numeric unknown value', () => {
    const result = handleElasticError(42);

    expect(result).toEqual({
      message: '42',
      uuid: 'test-uuid-1234',
    });
  });
});
