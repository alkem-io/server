import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Shared (non-messaging) push-notification throttle bucket.
 *
 * 034-messaging-notifications / D-7 (risk R-5): the previous implementation
 * called `cacheManager.set(key, count + 1, { ttl: 60 } as any)` — cache-manager
 * @5.7.6's `Cache.set` signature takes the TTL as a plain number of
 * MILLISECONDS, not an `{ ttl }` options object, so the cast silently dropped
 * the expiry and the counter never reset. The preceding get-then-set was also
 * non-atomic, so concurrent requests across replicas could both read the same
 * count and both proceed, letting the bucket exceed its cap.
 *
 * Fixed with an atomic ioredis INCR (correct by construction — no
 * check-then-set race) + an EXPIRE applied once, on the increment that
 * created the key (count === 1), with the TTL expressed in seconds (ioredis'
 * `expire` takes seconds, unlike cache-manager's milliseconds — the other
 * half of the original bug).
 *
 * SECOND fix (034 review): the key was `push:throttle:{userId}` — no epoch
 * component. INCR and EXPIRE are two commands, so if the process dies, the
 * connection drops, or Redis fails between them, the counter is left with NO
 * TTL and the key never expires. That user is then throttled PERMANENTLY,
 * with no self-healing path short of manual intervention. Suffixing the key
 * with the epoch minute makes the window addressable by time: a stranded key
 * belongs to a minute that will never be written to again, and the very next
 * minute starts from a fresh key at zero. The conditional EXPIRE is kept so
 * stranded keys are still reclaimed in the normal case.
 *
 * 034/R4 note: messaging notifications no longer participate in this bucket
 * AT ALL (D-21 deleted the parallel messaging budget; the FR-011b delay cap
 * bounds messaging volume by construction). This service now governs only
 * NON-messaging pushes, which continue to depend on it.
 */
@Injectable()
export class PushThrottleService {
  private readonly maxPerMinute: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxPerMinute = this.configService.get<number>(
      'notifications.push.throttle.max_per_minute' as any
    );
  }

  async isAllowed(userId: string): Promise<boolean> {
    // Fixed one-minute epoch bucket. The suffix is what makes a lost EXPIRE
    // self-heal instead of throttling the user forever.
    const epochMinute = Math.floor(Date.now() / 60000);
    const key = `push:throttle:${userId}:${epochMinute}`;

    try {
      // Atomic increment — no read-modify-write race across replicas.
      const count = await this.redis.incr(key);
      if (count === 1) {
        // Only the increment that created the key sets the window's TTL —
        // a rolling per-minute fixed window, not a sliding one that would
        // never expire under sustained traffic.
        await this.redis.expire(key, 60);
      }

      if (count > this.maxPerMinute) {
        this.logger.verbose?.(
          { message: 'Push notification throttled for user', userId },
          LogContext.PUSH_NOTIFICATION
        );
        return false;
      }

      return true;
    } catch (error: any) {
      // D-10: fail OPEN on store errors — an extra push during a Redis blip
      // is preferable to silently dropping notifications.
      this.logger.error?.(
        {
          message: 'Push throttle store error - failing open (allowed)',
          userId,
          error: error?.message,
        },
        error?.stack,
        LogContext.PUSH_NOTIFICATION
      );
      return true;
    }
  }
}
