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
 * Fixed with an atomic INCR (correct by construction — no check-then-set
 * race) + an EXPIRE applied once, on the increment that created the key
 * (count === 1), with the TTL expressed in seconds (Redis' `EXPIRE` takes
 * seconds, unlike cache-manager's milliseconds — the other half of the
 * original bug).
 *
 * SECOND fix (034 review): the key was `push:throttle:{userId}` — no epoch
 * component. Suffixing the key with the epoch minute makes the window
 * addressable by time: a key that somehow survives without a TTL belongs to a
 * minute that will never be written to again, and the very next minute starts
 * from a fresh key at zero, so a user can never be throttled permanently.
 *
 * THIRD fix (034 review): INCR and EXPIRE were two round trips, so a crash or
 * an EXPIRE failure between them left a key with no TTL — harmless for
 * throttling thanks to the epoch suffix, but never reclaimed. Both commands
 * now run in one Lua script, so the key always carries an expiry.
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
      // Atomic increment + TTL-on-create in a SINGLE round trip: INCR and
      // EXPIRE as two commands leave a window in which the key can end up
      // with no expiry at all (process death, connection drop, EXPIRE
      // failure). The epoch-minute suffix already bounds the damage, but the
      // stranded key would then never be reclaimed. Only the increment that
      // creates the key sets the TTL — a fixed per-minute window, not a
      // sliding one that would never expire under sustained traffic.
      const count = (await this.redis.eval(
        `local c = redis.call('INCR', KEYS[1])
         if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
         return c`,
        1,
        key,
        '60'
      )) as number;

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
