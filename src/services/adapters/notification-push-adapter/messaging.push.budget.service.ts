import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * 034-messaging-notifications — FR-012 / D-9.
 *
 * Per-user, per-minute push budget for conversation-message notifications,
 * held in a DISJOINT key namespace from the shared (non-messaging) push
 * throttle bucket (`push:throttle:{userId}` — see PushThrottleService). A
 * messaging push consumes ONLY this budget; it never decrements the shared
 * bucket, and non-messaging pushes never decrement this one — independence
 * in both directions (US4-AS2), so chat volume can never starve other
 * notification types and vice versa.
 *
 * Same atomic INCR + EXPIRE mechanism as the (now-fixed) shared throttle;
 * fails OPEN on store errors (D-10).
 */
@Injectable()
export class MessagingPushBudgetService {
  private readonly maxPerMinute: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxPerMinute = this.configService.get<number>(
      'notifications.messaging.push.throttle.max_per_minute' as any
    );
  }

  async isAllowed(userId: string): Promise<boolean> {
    // Fixed one-minute epoch bucket — simpler and cheaper than a sliding
    // window, and consistent with the shared throttle's semantics.
    const epochMinute = Math.floor(Date.now() / 60000);
    const key = `msg:notif:push:budget:${userId}:${epochMinute}`;

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 60);
      }

      if (count > this.maxPerMinute) {
        this.logger.verbose?.(
          {
            message: 'Messaging push budget exhausted for user',
            userId,
          },
          LogContext.PUSH_NOTIFICATION
        );
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Messaging push budget store error - failing open (allowed)',
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
