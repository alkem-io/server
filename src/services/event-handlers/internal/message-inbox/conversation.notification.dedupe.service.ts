import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const DEDUPE_TTL_SECONDS = 600; // 10 minutes (D-12)

/**
 * 034-messaging-notifications — FR-013 / D-12.
 *
 * At-most-one notification dispatch per message event: an atomic
 * SET-if-absent marker keyed on the message ID, with a short TTL. No
 * durable outbox/seam (deliberately — D-12: the platform's accepted
 * semantic is at-most-once; moving this inside the ingress ack boundary
 * would convert a missed email into duplicated chat messages/VC replies via
 * the unbounded requeue on the ingress).
 */
@Injectable()
export class ConversationNotificationDedupeService {
  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Attempts to claim the given message ID for notification dispatch.
   * @returns true if this call claimed it (proceed to notify); false if it
   * was already claimed (a redelivery — skip, do not dispatch again).
   * Fails OPEN on store errors (D-10): treats the message as not-yet-claimed
   * so notification dispatch proceeds rather than being silently dropped.
   */
  async claim(messageId: string): Promise<boolean> {
    const key = `msg:notif:dedupe:${messageId}`;
    try {
      const result = await this.redis.set(
        key,
        '1',
        'EX',
        DEDUPE_TTL_SECONDS,
        'NX'
      );
      return result === 'OK';
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Dedupe marker store error - failing open (treating as not yet dispatched)',
          messageId,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return true;
    }
  }
}
