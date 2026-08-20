import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Leading-edge email suppression for callout-reaction notifications.
 *
 * Within a configured window (~300s by default) only the first qualifying
 * reaction to a given callout by any member causes an email to the publisher.
 * Subsequent reactions inside that window are silently dropped (leading-edge
 * drop, not a deferred digest). A new window opens when the marker expires.
 *
 * The window is keyed per (recipient, callout) so bursts on different callouts
 * or to different publishers do not interfere with each other.
 *
 * Failure convention: any Redis error causes this method to return `true`
 * (allow the email), log the error, and proceed — matching the platform's D-10
 * fail-open convention used by the push throttle. A lost marker admits at most
 * one extra leading email per window, which is accepted as benign.
 */
@Injectable()
export class CalloutReactionEmailSuppressionService {
  private readonly windowSeconds: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.windowSeconds = this.configService.get(
      'notifications.callout_reactions.email_suppression_window_seconds',
      { infer: true }
    );
  }

  /**
   * Returns `true` and claims the window when this is the first qualifying
   * email in the window; returns `false` when the window is already claimed.
   * Fails open on Redis errors.
   */
  async shouldSendLeadingEmail(
    recipientId: string,
    calloutId: string
  ): Promise<boolean> {
    const key = `notifications:email:suppress:callout-reaction:${recipientId}:${calloutId}`;
    try {
      // SET EX NX — atomic: sets the key only when it does not exist, and
      // applies the TTL in the same command so there is no window between a
      // successful SET and a failed EXPIRE.
      const result = await this.redis.set(
        key,
        '1',
        'EX',
        this.windowSeconds,
        'NX'
      );
      // SET NX returns 'OK' on success (key did not exist) and null when the
      // key already existed (window is active).
      return result === 'OK';
    } catch (error: any) {
      // D-10: fail open — an extra leading email during a Redis blip is
      // preferable to silently dropping a notification.
      this.logger.error?.(
        {
          message:
            'Callout-reaction email suppression store error — failing open',
          recipientId,
          calloutId,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return true;
    }
  }
}
