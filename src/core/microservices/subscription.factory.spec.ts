import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import { subscriptionFactory } from './subscription.factory';

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
      'Skipping RabbitMQ connection for schema bootstrap',
      LogContext.SUBSCRIPTIONS
    );
  });

  it('should return undefined when amqp connection fails', async () => {
    // Use a port that won't have RabbitMQ running to trigger connection failure
    const badConfigService = {
      get: vi.fn().mockReturnValue({
        connection: {
          user: 'guest',
          password: 'guest',
          host: '127.0.0.255', // unreachable host
          port: 1, // unlikely port
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
    // Without the bootstrap flag, it will try to connect and fail
    const badConfigService = {
      get: vi.fn().mockReturnValue({
        connection: {
          user: 'guest',
          password: 'guest',
          host: '127.0.0.255',
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
