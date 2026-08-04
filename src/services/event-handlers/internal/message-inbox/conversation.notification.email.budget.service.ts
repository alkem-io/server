import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * 034-messaging-notifications — sec-server-10.
 *
 * GLOBAL, per-user, per-window email budget for conversation-message
 * notifications — a second, independent line of defense alongside the
 * per-(recipient, conversation) suppression window
 * (ConversationNotificationSuppressionService). The suppression window
 * resets whenever a NEW conversation is created, so it alone cannot bound
 * how much platform-originated email one attacker can cause across many
 * conversations; this budget is keyed on the recipient ONLY (no
 * conversation dimension), so it caps total conversation-message email
 * volume to a single user regardless of how many distinct conversations
 * the sender spreads the fan-out across.
 *
 * Same atomic INCR + EXPIRE mechanism as MessagingPushBudgetService, in a
 * distinct key namespace (`msg:notif:email:budget:*`, vs.
 * `msg:notif:push:budget:*` and `msg:notif:email:supp:*`). Fails OPEN on
 * store errors (D-10 precedent) — an outage of the budget store must not
 * silently drop conversation-message email.
 */
@Injectable()
export class ConversationNotificationEmailBudgetService {
  private readonly maxPerWindow: number;
  private readonly windowSeconds: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxPerWindow = this.configService.get<number>(
      'notifications.messaging.email.budget.max_per_window' as any
    );
    this.windowSeconds = this.configService.get<number>(
      'notifications.messaging.email.budget.window_seconds' as any
    );
  }

  async isAllowed(userId: string): Promise<boolean> {
    // Fixed epoch bucket of `windowSeconds` — simpler and cheaper than a
    // sliding window, consistent with the messaging push budget's approach.
    const epochWindow = Math.floor(Date.now() / (this.windowSeconds * 1000));
    const key = `msg:notif:email:budget:${userId}:${epochWindow}`;

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, this.windowSeconds);
      }

      if (count > this.maxPerWindow) {
        this.logger.verbose?.(
          {
            message: 'Global messaging email budget exhausted for user',
            userId,
          },
          LogContext.NOTIFICATIONS
        );
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Messaging email budget store error - failing open (allowed)',
          userId,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return true;
    }
  }
}
