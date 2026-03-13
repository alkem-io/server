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

    it('should include error details in non-production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('dev error');
      error.name = 'TestError';
      const host = createMockHost('http');

      filter.catch(error, host as any);

      const jsonArg = host.mockResponse.json.mock.calls[0][0];
      expect(jsonArg.name).toBe('TestError');
      expect(jsonArg.message).toBe('dev error');
      expect(jsonArg.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('secret error');
      const host = createMockHost('http');

      filter.catch(error, host as any);

      const jsonArg = host.mockResponse.json.mock.calls[0][0];
      expect(jsonArg.name).toBeUndefined();
      expect(jsonArg.message).toBe('Internal Server Error');
      expect(jsonArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('catch - graphql context', () => {
    it('should return GraphQLError with original error in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

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

      process.env.NODE_ENV = originalEnv;
    });

    it('should return GraphQLError without original error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('secret graphql error');
      const host = createMockHost('graphql');

      const result = filter.catch(error, host as any);

      expect(result).toBeInstanceOf(GraphQLError);
      expect((result as GraphQLError).message).toBe('secret graphql error');
      expect((result as GraphQLError).extensions.code).toBe(
        AlkemioErrorStatus.UNSPECIFIED
      );
      expect((result as GraphQLError).originalError).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
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
