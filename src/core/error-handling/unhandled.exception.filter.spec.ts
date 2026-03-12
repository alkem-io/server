import { GraphQLError } from 'graphql';
import { vi } from 'vitest';
import { UnhandledExceptionFilter } from './unhandled.exception.filter';

describe('UnhandledExceptionFilter', () => {
  let filter: UnhandledExceptionFilter;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    filter = new UnhandledExceptionFilter(mockLogger);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch - HTTP context', () => {
    it('should respond with 500 status in HTTP context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
      const exception = new Error('Unexpected failure');

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
        }),
      } as any;

      filter.catch(exception, host);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Unexpected failure',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide details in production for HTTP context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
      const exception = new Error('Secret error');

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
        }),
      } as any;

      filter.catch(exception, host);

      const jsonArg = jsonFn.mock.calls[0][0];
      expect(jsonArg.message).toBe('Internal Server Error');
      expect(jsonArg.name).toBeUndefined();
      expect(jsonArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('catch - GraphQL context', () => {
    it('should return GraphQLError in non-production GraphQL context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('GraphQL failure');

      const host = {
        getType: () => 'graphql',
        switchToHttp: vi.fn(),
      } as any;

      const result = filter.catch(exception, host);

      expect(result).toBeInstanceOf(GraphQLError);
      expect((result as GraphQLError).message).toBe('GraphQL failure');
      expect((result as GraphQLError).extensions?.errorId).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should return sanitized GraphQLError in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Secret error');

      const host = {
        getType: () => 'graphql',
        switchToHttp: vi.fn(),
      } as any;

      const result = filter.catch(exception, host);

      expect(result).toBeInstanceOf(GraphQLError);
      // In production, originalError should not be included
      expect((result as GraphQLError).originalError).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('catch - other context', () => {
    it('should return the exception for unknown context types', () => {
      const exception = new Error('RPC error');

      const host = {
        getType: () => 'rpc',
        switchToHttp: vi.fn(),
      } as any;

      const result = filter.catch(exception, host);

      expect(result).toBe(exception);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
