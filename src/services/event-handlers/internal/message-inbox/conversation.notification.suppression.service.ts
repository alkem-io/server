import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * 034-messaging-notifications — FR-011 / D-8.
 *
 * EMAIL-only, per (recipient, conversation) leading-edge suppression window:
 * after an email is sent, further messages in the same conversation produce
 * no additional email to that recipient until the window elapses. A single
 * atomic SET-if-absent marker with TTL does both the check AND the claim in
 * one round trip — no separate get-then-set race across replicas.
 *
 * Push is NOT suppressed here — it relies on the separate messaging push
 * budget (FR-012, MessagingPushBudgetService).
 */
@Injectable()
export class ConversationNotificationSuppressionService {
  private readonly windowSeconds: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.windowSeconds = this.configService.get<number>(
      'notifications.messaging.email_suppression_window_seconds' as any
    );
  }

  /**
   * @returns true if this recipient/conversation pair is currently
   * suppressed (an email was already sent within the window — skip this
   * one); false if this call claimed the window (proceed to send).
   * Fails OPEN on store errors (D-10): treats as NOT suppressed so the email
   * is sent rather than silently lost.
   */
  async isSuppressed(
    recipientId: string,
    conversationId: string
  ): Promise<boolean> {
    const key = `msg:notif:email:supp:${recipientId}:${conversationId}`;
    try {
      const result = await this.redis.set(
        key,
        '1',
        'EX',
        this.windowSeconds,
        'NX'
      );
      // 'OK' means WE just claimed the window (not previously suppressed);
      // null means the key already existed (already suppressed).
      return result !== 'OK';
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Email suppression store error - failing open (not suppressed)',
          recipientId,
          conversationId,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return false;
    }
  }
}
