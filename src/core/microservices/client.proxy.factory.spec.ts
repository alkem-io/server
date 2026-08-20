import { MessagingQueue } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';
import { vi } from 'vitest';
import { clientProxyFactory } from './client.proxy.factory';

describe('clientProxyFactory', () => {
  let logger: LoggerService;
  let configService: ConfigService<AlkemioConfig, true>;
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    logger = { error: vi.fn() } as unknown as LoggerService;
    configService = {
      get: vi.fn().mockReturnValue({
        connection: { user: 'u', password: 'p', host: 'h', port: 5672 },
      }),
    } as unknown as ConfigService<AlkemioConfig, true>;
    createSpy = vi
      .spyOn(ClientProxyFactory, 'create')
      .mockReturnValue({} as never);
  });

  it('declaration-equivalence pin: the lifecycle client asserts EXACTLY the frozen quorum literal', async () => {
    await clientProxyFactory(MessagingQueue.COLLABORATION_LIFECYCLE, {
      durable: true,
      persistent: true,
      queueArguments: { 'x-queue-type': 'quorum' },
    })(logger, configService);

    const opts = (createSpy.mock.calls[0][0] as any).options;
    // Byte-equivalent to collab-service's consumer declaration: durable + quorum
    // and NOTHING else (no DLX/TTL; exclusive/autoDelete default to false in
    // amqplib). `toEqual` is exact — an extra key fails, which is the point: an
    // extra argument is as inequivalent as a missing one and PRECONDITION_FAILs
    // whichever side declares the queue second. persistent stays a top-level
    // client option, not a queue-declaration argument.
    expect(opts.queueOptions).toEqual({
      durable: true,
      arguments: { 'x-queue-type': 'quorum' },
    });
    expect(opts.queue).toBe(MessagingQueue.COLLABORATION_LIFECYCLE);
    expect(opts.persistent).toBe(true);
  });

  it('existing fire-and-forget clients declare just { durable } (no arguments key) and non-persistent', async () => {
    await clientProxyFactory(MessagingQueue.NOTIFICATIONS)(
      logger,
      configService
    );

    const opts = (createSpy.mock.calls[0][0] as any).options;
    // No `arguments` key at all — NOT `arguments: undefined`, which would itself
    // be an inequivalent declaration for these classic queues.
    expect(opts.queueOptions).toEqual({ durable: true });
    expect(opts.persistent).toBe(false);
  });
});
