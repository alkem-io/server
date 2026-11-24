import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { SecondFactorRequiredHttpException } from '@core/auth/second-factor/second-factor-required.http.exception';
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

    it('writes the second-factor refusal body unchanged', () => {
      const jsonFn = vi.fn();
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({ user: undefined }),
        }),
      } as any;

      filter.catch(new SecondFactorRequiredHttpException() as any, host);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({
        statusCode: 403,
        error_code: 'second_factor_required',
      });
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

      const respond = () => {
        const jsonFn = vi.fn();
        const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
        const exception = {
          name: 'BadRequest',
          message: 'Bad request',
          details: { reason: 'internal' },
          context: LogContext.API,
          code: AlkemioErrorStatus.BAD_USER_INPUT,
          numericCode: 1000,
          userMessage: 'Error',
          errorId: 'err-4',
          getStatus: vi.fn().mockReturnValue(400),
          stack: 'Error: Bad request\n    at somewhere.ts:1:1',
        } as any;
        const host = {
          getType: () => 'http',
          switchToHttp: () => ({
            getResponse: () => ({ status: statusFn }),
            getRequest: () => ({ user: { actorID: 'actor-77' } }),
          }),
        } as any;
        filter.catch(exception, host);
        return JSON.parse(JSON.stringify(jsonFn.mock.calls[0][0]));
      };

      it('returns only the public fields with the switch unset, whatever NODE_ENV', () => {
        process.env.NODE_ENV = 'dev';
        delete process.env.ERROR_RESPONSE_DEBUG;

        const body = respond();

        expect(Object.keys(body).sort()).toEqual(
          [
            'statusCode',
            'code',
            'numericCode',
            'userMessage',
            'timestamp',
            'message',
            'errorId',
          ].sort()
        );
        expect(body.message).toBe('Bad request');
        expect(JSON.stringify(body)).not.toContain('actor-77');
      });

      it('adds context, details and stack with the switch on', () => {
        process.env.NODE_ENV = 'production';
        process.env.ERROR_RESPONSE_DEBUG = 'true';

        const body = respond();

        expect(body.message).toBe('Bad request');
        expect(body.context).toBe(LogContext.API);
        expect(body.details).toEqual(
          expect.objectContaining({ reason: 'internal' })
        );
        expect(body.stack).toContain('somewhere.ts');
      });
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
