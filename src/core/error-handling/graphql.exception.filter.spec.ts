import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { GraphQLError } from 'graphql';
import { vi } from 'vitest';
import { GraphqlExceptionFilter } from './graphql.exception.filter';

describe('GraphqlExceptionFilter', () => {
  let filter: GraphqlExceptionFilter;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    filter = new GraphqlExceptionFilter(mockLogger);
  });

  const createMockHost = (userActorID?: string) => ({
    switchToHttp: () => ({
      getNext: () => ({
        req: {
          user: userActorID ? { actorID: userActorID } : undefined,
        },
      }),
    }),
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should log the exception', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED
      );
      const host = createMockHost('user-1');

      filter.catch(exception, host as any);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should set userId from actorContext when available', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED
      );
      const host = createMockHost('user-1');

      filter.catch(exception, host as any);

      expect(exception.details?.userId).toBe('user-1');
    });

    it('should use "unknown" when no user available', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED
      );
      const host = createMockHost();

      filter.catch(exception, host as any);

      expect(exception.details?.userId).toBe('unknown');
    });

    it('should return exception in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED
      );
      const host = createMockHost();

      const result = filter.catch(exception, host as any);

      expect(result).toBe(exception);
      process.env.NODE_ENV = originalEnv;
    });

    it('should return sanitized GraphQLError in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED,
        undefined,
        'error-id-123'
      );
      const host = createMockHost();

      const result = filter.catch(exception, host as any);

      expect(result).toBeInstanceOf(GraphQLError);
      expect(result.message).toBe('Test error');
      expect((result as GraphQLError).extensions?.errorId).toBe('error-id-123');
      process.env.NODE_ENV = originalEnv;
    });

    it('should use exception details userId when present', () => {
      const exception = new BaseException(
        'Test error',
        LogContext.API,
        AlkemioErrorStatus.UNSPECIFIED,
        { userId: 'from-details' }
      );
      const host = createMockHost('from-context');

      filter.catch(exception, host as any);

      expect(exception.details?.userId).toBe('from-details');
    });
  });
});
