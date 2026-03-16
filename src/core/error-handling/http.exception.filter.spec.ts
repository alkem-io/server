import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { vi } from 'vitest';
import { HttpExceptionFilter } from './http.exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    filter = new HttpExceptionFilter(mockLogger);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should return exception when context type is not http', () => {
      const exception = {
        name: 'TestException',
        details: {},
        getStatus: vi.fn().mockReturnValue(400),
        stack: 'stack',
      } as any;

      const host = {
        getType: () => 'graphql',
        switchToHttp: vi.fn(),
      } as any;

      const result = filter.catch(exception, host);

      expect(result).toBe(exception);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should respond with JSON for HTTP context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });

      const exception = {
        name: 'BadRequest',
        message: 'Bad request',
        details: {},
        code: AlkemioErrorStatus.UNSPECIFIED,
        numericCode: 1000,
        userMessage: 'Something went wrong',
        errorId: 'err-1',
        context: LogContext.API,
        stack: 'Error: Bad request\n    at ...',
        getStatus: vi.fn().mockReturnValue(400),
      } as any;

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({
            status: statusFn,
          }),
          getRequest: () => ({
            user: { actorID: 'user-1' },
          }),
        }),
      } as any;

      filter.catch(exception, host);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Bad request',
          errorId: 'err-1',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should set userId to unknown when no user on request', () => {
      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });

      const exception = {
        name: 'Forbidden',
        message: 'Forbidden',
        details: {},
        code: AlkemioErrorStatus.FORBIDDEN,
        numericCode: 1000,
        userMessage: 'Access denied',
        errorId: 'err-2',
        getStatus: vi.fn().mockReturnValue(403),
        stack: '',
      } as any;

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({ user: undefined }),
        }),
      } as any;

      filter.catch(exception, host);

      expect(exception.details.userId).toBe('unknown');
    });

    it('should hide details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });

      const exception = {
        name: 'InternalError',
        message: 'Secret',
        details: { secret: 'data' },
        context: LogContext.API,
        code: AlkemioErrorStatus.UNSPECIFIED,
        numericCode: 1000,
        userMessage: 'Error',
        errorId: 'err-3',
        getStatus: vi.fn().mockReturnValue(500),
        stack: 'stack trace',
      } as any;

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({ user: undefined }),
        }),
      } as any;

      filter.catch(exception, host);

      const jsonArg = jsonFn.mock.calls[0][0];
      expect(jsonArg.context).toBeUndefined();
      expect(jsonArg.details).toBeUndefined();
      expect(jsonArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
