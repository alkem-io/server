import { LogContext } from '@common/enums';
import { Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  MESSAGING_REDIS_CLIENT,
  messagingRedisClientProvider,
} from './messaging-redis.provider';

/**
 * Provides the shared ioredis client used by the messaging-notifications
 * atomic primitives (push throttle fix, dedupe marker, and the per-recipient
 * digest scheduler state — 034-messaging-notifications).
 *
 * Nest deduplicates module imports by class, so every consumer module that
 * imports `MessagingRedisModule` shares the single underlying client
 * instance rather than opening a new connection per import.
 */
@Module({
  providers: [messagingRedisClientProvider],
  exports: [MESSAGING_REDIS_CLIENT],
})
export class MessagingRedisModule implements OnModuleInit {
  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Opens the connection at boot rather than on the first command.
   *
   * The client is built with `lazyConnect` so a Redis that is down at startup
   * cannot crash the application — that part is deliberate and stays. But
   * `lazyConnect` combined with the factory's `enableOfflineQueue: false`
   * makes the FIRST command fail unconditionally, because the client is still
   * in `connecting` when it is issued. Before R4 that cost nothing much; now
   * it costs a whole notification, because the arrival path only ARMS a digest
   * timer and there is no immediate send to fall back on. The first chat
   * message after every pod start would silently produce no email and no push.
   *
   * Connecting here moves that unavoidable first failure off the message path
   * and into startup, where nothing is waiting on it. The `catch` is what
   * preserves the crash-safety `lazyConnect` was chosen for: a Redis that is
   * unreachable at boot leaves the client retrying in the background (ioredis'
   * default `retryStrategy`, which the factory deliberately does not override)
   * while the app comes up, exactly as before.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error: any) {
      this.logger.warn?.(
        `Messaging Redis client could not connect at startup - it will keep retrying in the background: ${error?.message}`,
        LogContext.NOTIFICATIONS
      );
    }
  }
}
