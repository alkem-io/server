import { Module } from '@nestjs/common';
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
export class MessagingRedisModule {}
