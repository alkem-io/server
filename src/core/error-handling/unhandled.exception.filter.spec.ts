import { AlkemioErrorStatus } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UnhandledExceptionFilter } from './unhandled.exception.filter';

describe('UnhandledExceptionFilter', () => {
  let filter: UnhandledExceptionFilter;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnhandledExceptionFilter, MockWinstonProvider],
    }).compile();

    filter = module.get(UnhandledExceptionFilter);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  const createMockHost = (contextType: string) => {
    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    return {
      getType: vi.fn().mockReturnValue(contextType),
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue(mockResponse),
      }),
      mockResponse,
    };
  };

  describe('catch - http context', () => {
    it('should log the error and respond with 500 in http context', () => {
      const error = new Error('test error');
      const host = createMockHost('http');

      filter.catch(error, host as any);

      expect(logger.error).toHaveBeenCalledOnce();
      expect(host.switchToHttp).toHaveBeenCalled();
      expect(host.mockResponse.status).toHaveBeenCalledWith(500);
      expect(host.mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          errorId: expect.any(String),
        })
      );
    });

    describe('debug detail', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
      afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalDebug === undefined) {
          delete process.env.ERROR_RESPONSE_DEBUG;
        } else {
          process.env.ERROR_RESPONSE_DEBUG = originalDebug;
        }
      });

      it('includes the error name, message and stack with the switch on', () => {
        process.env.ERROR_RESPONSE_DEBUG = 'true';

        const error = new Error('dev error');
        error.name = 'TestError';
        const host = createMockHost('http');

        filter.catch(error, host as any);

        const jsonArg = host.mockResponse.json.mock.calls[0][0];
        expect(jsonArg.name).toBe('TestError');
        expect(jsonArg.message).toBe('dev error');
        expect(jsonArg.stack).toBeDefined();
      });

      it.each([
        'dev',
        'production',
      ])('returns only the public fields with the switch unset and NODE_ENV=%s', nodeEnv => {
        process.env.NODE_ENV = nodeEnv;
        delete process.env.ERROR_RESPONSE_DEBUG;

        const error = new Error('secret error');
        const host = createMockHost('http');

        filter.catch(error, host as any);

        const body = JSON.parse(
          JSON.stringify(host.mockResponse.json.mock.calls[0][0])
        );
        expect(Object.keys(body).sort()).toEqual(
          ['errorId', 'message', 'statusCode', 'timestamp'].sort()
        );
        expect(body.statusCode).toBe(500);
        expect(body.message).toBe('Internal Server Error');
      });
    });
  });

  describe('catch - graphql context', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalDebug === undefined) {
        delete process.env.ERROR_RESPONSE_DEBUG;
      } else {
        process.env.ERROR_RESPONSE_DEBUG = originalDebug;
      }
    });

    it('returns the original error with the switch on', () => {
      process.env.ERROR_RESPONSE_DEBUG = 'true';

      const error = new Error('graphql error');
      const host = createMockHost('graphql');

      const result = filter.catch(error, host as any);

      expect(result).toBeInstanceOf(GraphQLError);
      expect((result as GraphQLError).message).toBe('graphql error');
      expect((result as GraphQLError).extensions.code).toBe(
        AlkemioErrorStatus.UNSPECIFIED
      );
      expect((result as GraphQLError).extensions.errorId).toBeDefined();
      expect((result as GraphQLError).originalError).toBe(error);
    });

    it.each([
      'dev',
      'production',
    ])('returns the fixed text with the switch unset and NODE_ENV=%s', nodeEnv => {
      process.env.NODE_ENV = nodeEnv;
      delete process.env.ERROR_RESPONSE_DEBUG;

      const error = new Error('secret graphql error');
      const host = createMockHost('graphql');

      const result = filter.catch(error, host as any) as GraphQLError;

      expect(result).toBeInstanceOf(GraphQLError);
      expect(result.message).toBe('Internal Server Error');
      expect(result.extensions.code).toBe(AlkemioErrorStatus.UNSPECIFIED);
      expect(result.extensions.stacktrace).toBeUndefined();
      expect(result.originalError).toBeUndefined();
    });
  });

  describe('catch - unknown context', () => {
    it('should return the exception for unknown context types', () => {
      const error = new Error('rpc error');
      const host = createMockHost('rpc');

      const result = filter.catch(error, host as any);

      expect(result).toBe(error);
    });
  });
});
