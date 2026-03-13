import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { RequestLoggerMiddleware } from './request.logger.middleware';

describe('RequestLoggerMiddleware', () => {
  const createMiddleware = async (
    requestConfig = {
      full_logging_enabled: false,
      headers_logging_enabled: false,
    },
    responseConfig = { headers_logging_enabled: false }
  ) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestLoggerMiddleware, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'monitoring.logging.requests') return requestConfig;
              if (key === 'monitoring.logging.responses') return responseConfig;
              return {};
            }),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    return module.get(RequestLoggerMiddleware);
  };

  it('should be defined', async () => {
    const middleware = await createMiddleware();
    expect(middleware).toBeDefined();
  });

  it('should call next', async () => {
    const middleware = await createMiddleware();
    const req = { path: '/graphql', headers: {} } as any;
    const res = { on: vi.fn() } as any;
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should log request path when headers logging is enabled', async () => {
    const middleware = await createMiddleware({
      full_logging_enabled: false,
      headers_logging_enabled: true,
    });

    const loggerProvider = MockWinstonProvider.useValue;
    const req = {
      path: '/graphql',
      headers: { 'content-type': 'application/json' },
    } as any;
    const res = { on: vi.fn() } as any;
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(loggerProvider.verbose).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
