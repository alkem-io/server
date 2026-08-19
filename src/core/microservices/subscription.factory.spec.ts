import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChannelModel } from 'amqplib';
import { PubSub } from 'graphql-subscriptions';
import {
  attachConnectionResilienceHandlers,
  subscriptionFactory,
} from './subscription.factory';

describe('subscriptionFactory', () => {
  let logger: LoggerService;
  let configService: ConfigService;

  beforeEach(() => {
    logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue({
        connection: {
          user: 'guest',
          password: 'guest',
          host: 'localhost',
          port: 5672,
        },
      }),
    } as unknown as ConfigService;
  });

  it('should return a PubSub instance when isBootstrap is true', async () => {
    const result = await subscriptionFactory(
      logger,
      configService as any,
      'exchange',
      'queue',
      true
    );

    expect(result).toBeInstanceOf(PubSub);
    expect(logger.log).toHaveBeenCalledWith(
      'Skipping RabbitMQ subscription connection (in-memory PubSub)',
      LogContext.SUBSCRIPTIONS
    );
  });

  it('should return an in-memory PubSub when ALKEMIO_DISABLE_SUBSCRIPTIONS=true (auth-reset worker)', async () => {
    const prev = process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS;
    process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS = 'true';
    try {
      // isBootstrap=false, but the env flag must still short-circuit to an
      // in-memory PubSub so the worker opens no RabbitMQ subscription consumers.
      const result = await subscriptionFactory(
        logger,
        configService as any,
        'exchange',
        'queue',
        false
      );

      expect(result).toBeInstanceOf(PubSub);
      expect(logger.log).toHaveBeenCalledWith(
        'Skipping RabbitMQ subscription connection (in-memory PubSub)',
        LogContext.SUBSCRIPTIONS
      );
    } finally {
      if (prev === undefined) {
        delete process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS;
      } else {
        process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS = prev;
      }
    }
  });

  it('should return undefined when amqp connection fails', async () => {
    // Use localhost on a port that's definitely not listening — kernel
    // responds immediately with "connection refused" (no TCP timeout).
    const badConfigService = {
      get: vi.fn().mockReturnValue({
        connection: {
          user: 'guest',
          password: 'guest',
          host: '127.0.0.1',
          port: 1,
        },
      }),
    } as unknown as ConfigService;

    const result = await subscriptionFactory(
      logger,
      badConfigService as any,
      'exchange',
      'queue',
      false
    );

    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not connect to RabbitMQ'),
      LogContext.SUBSCRIPTIONS
    );
  }, 15000);

  it('should use default isBootstrap value of false', async () => {
    const badConfigService = {
      get: vi.fn().mockReturnValue({
        connection: {
          user: 'guest',
          password: 'guest',
          host: '127.0.0.1',
          port: 1,
        },
      }),
    } as unknown as ConfigService;

    const result = await subscriptionFactory(
      logger,
      badConfigService as any,
      'exchange',
      'queue'
    );

    expect(result).toBeUndefined();
  }, 15000);
});

describe('attachConnectionResilienceHandlers', () => {
  let logger: LoggerService;

  /** A fake amqplib ChannelModel that records its registered event handlers. */
  const makeFakeConnection = () => {
    const handlers: Record<string, (arg?: unknown) => void> = {};
    const on = vi.fn((event: string, cb: (arg?: unknown) => void) => {
      handlers[event] = cb;
    });
    return { on, handlers } as unknown as ChannelModel & {
      handlers: Record<string, (arg?: unknown) => void>;
      on: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
  });

  it("registers 'error' and 'close' listeners on the connection", () => {
    const conn = makeFakeConnection();
    attachConnectionResilienceHandlers(conn, 'queue', logger);

    expect(conn.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(conn.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it("logs (and does NOT rethrow) on a connection 'error' — the crash guard", () => {
    const conn = makeFakeConnection();
    attachConnectionResilienceHandlers(conn, 'my-queue', logger);

    // Simulate amqplib emitting the connection error that used to crash the
    // whole process. The handler must swallow + log it, never rethrow.
    expect(() =>
      conn.handlers.error(
        Object.assign(new Error('Unexpected close'), { stack: 'STK' })
      )
    ).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('my-queue'),
      'STK',
      LogContext.SUBSCRIPTIONS
    );
  });

  it("logs a warning on a connection 'close'", () => {
    const conn = makeFakeConnection();
    attachConnectionResilienceHandlers(conn, 'my-queue', logger);

    conn.handlers.close();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('my-queue'),
      LogContext.SUBSCRIPTIONS
    );
  });
});
