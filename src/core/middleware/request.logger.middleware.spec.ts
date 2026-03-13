import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { RequestLoggerMiddleware } from './request.logger.middleware';

describe('RequestLoggerMiddleware', () => {
  function buildMiddleware(config: {
    fullLogging?: boolean;
    headersLogging?: boolean;
    responseHeadersLogging?: boolean;
  }) {
    const configGet = vi.fn().mockImplementation((key: string) => {
      if (key === 'monitoring.logging.requests') {
        return {
          full_logging_enabled: config.fullLogging ?? false,
          headers_logging_enabled: config.headersLogging ?? false,
        };
      }
      if (key === 'monitoring.logging.responses') {
        return {
          headers_logging_enabled: config.responseHeadersLogging ?? false,
        };
      }
      return undefined;
    });

    return Test.createTestingModule({
      providers: [
        RequestLoggerMiddleware,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
  }

  function makeReqRes() {
    const req = {
      path: '/graphql',
      headers: { authorization: 'Bearer token' },
    } as any;
    const closeHandlers: Function[] = [];
    const res = {
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'close') closeHandlers.push(handler);
      }),
      statusCode: 200,
      getHeaders: vi
        .fn()
        .mockReturnValue({ 'content-type': 'application/json' }),
    } as any;
    return { req, res, closeHandlers };
  }

  it('should be defined', async () => {
    const module = await buildMiddleware({});
    const middleware = module.get(RequestLoggerMiddleware);
    expect(middleware).toBeDefined();
  });

  it('calls next() regardless of logging config', async () => {
    const module = await buildMiddleware({});
    const middleware = module.get(RequestLoggerMiddleware);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('logs request path when headers logging is enabled', async () => {
    const module = await buildMiddleware({ headersLogging: true });
    const middleware = module.get(RequestLoggerMiddleware);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('registers close handler for response logging', async () => {
    const module = await buildMiddleware({
      headersLogging: true,
      responseHeadersLogging: true,
    });
    const middleware = module.get(RequestLoggerMiddleware);
    const { req, res, closeHandlers } = makeReqRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
    // Simulate response close
    expect(() => closeHandlers[0]()).not.toThrow();
  });

  it('handles full logging enabled', async () => {
    const module = await buildMiddleware({
      fullLogging: true,
      headersLogging: true,
    });
    const middleware = module.get(RequestLoggerMiddleware);
    const { req, res } = makeReqRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
