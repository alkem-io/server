import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlExceptionFilter } from './graphql.exception.filter';

describe('GraphqlExceptionFilter', () => {
  let filter: GraphqlExceptionFilter;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphqlExceptionFilter, MockWinstonProvider],
    }).compile();

    filter = module.get(GraphqlExceptionFilter);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  const createMockHost = (userId?: string) => ({
    switchToHttp: vi.fn().mockReturnValue({
      getNext: vi.fn().mockReturnValue({
        req: {
          user: { actorID: userId ?? 'test-user-id' },
        },
      }),
    }),
  });

  it('should log the exception with userId from actorID', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN
    );
    const host = createMockHost('user-123');

    filter.catch(exception, host as any);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(exception.details?.userId).toBe('user-123');
  });

  it('should use userId from exception details if present', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN,
      { userId: 'detail-user' }
    );
    const host = createMockHost('actor-user');

    filter.catch(exception, host as any);

    expect(exception.details?.userId).toBe('detail-user');
  });

  it('should use "unknown" when no userId is available', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN
    );
    const host = {
      switchToHttp: vi.fn().mockReturnValue({
        getNext: vi.fn().mockReturnValue({
          req: {
            user: { actorID: undefined },
          },
        }),
      }),
    };

    filter.catch(exception, host as any);

    expect(exception.details?.userId).toBe('unknown');
  });

  describe('production mode', () => {
    it('should return a sanitized GraphQLError in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new BaseException(
        'secret error',
        LogContext.AUTH,
        AlkemioErrorStatus.FORBIDDEN,
        undefined,
        'error-id-123'
      );
      const host = createMockHost();

      const result = filter.catch(exception, host as any);

      expect(result).toBeInstanceOf(GraphQLError);
      expect((result as GraphQLError).message).toBe('secret error');
      expect((result as GraphQLError).extensions.errorId).toBe('error-id-123');
      expect((result as GraphQLError).extensions.code).toBe(
        String(AlkemioErrorStatus.FORBIDDEN)
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('non-production mode', () => {
    it('should return the original exception in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new BaseException(
        'dev error',
        LogContext.AUTH,
        AlkemioErrorStatus.FORBIDDEN
      );
      const host = createMockHost();

      const result = filter.catch(exception, host as any);

      expect(result).toBe(exception);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
