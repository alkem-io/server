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

  it('declaration-equivalence pin: the lifecycle client asserts EXACTLY the frozen quorum + int32(-1) delivery-limit literal', async () => {
    await clientProxyFactory(MessagingQueue.COLLABORATION_LIFECYCLE, {
      durable: true,
      persistent: true,
      queueArguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': { '!': 'int32', value: -1 },
      },
    })(logger, configService);

    const opts = (createSpy.mock.calls[0][0] as any).options;
    // Byte-equivalent to collab-service's consumer declaration: durable + quorum
    // + x-delivery-limit -1, and NOTHING else (no DLX/TTL; exclusive/autoDelete
    // default to false in amqplib). x-delivery-limit=-1 is load-bearing on 4.0+
    // (quorum defaults it to 20, no DLX -> a redelivered document.deleted would
    // drop at 20). `{ '!': 'int32', value: -1 }` is amqplib's typed field-table
    // trapdoor forcing AMQP type `I` (signed 32-bit) to match Go's int32(-1)
    // byte-for-byte. `toEqual` is exact — the width is convention/future-proofing
    // (a real 4.0.5 gate proved the broker compares x-delivery-limit by value,
    // not width), but keeping it typed keeps producer + Go consumer unambiguous.
    // persistent stays a top-level client option, not a queue-declaration argument.
    expect(opts.queueOptions).toEqual({
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': { '!': 'int32', value: -1 },
      },
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
