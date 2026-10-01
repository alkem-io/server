import { createHash } from 'node:crypto';
import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { positiveIntegerOrDefault } from './platform.invitation.config.util';

const DEFAULT_RESEND_COOLDOWN_SECONDS = 300;

/**
 * Cooldown for resending a platform invitation email to one address on one
 * role set.
 *
 * The first resend inside a window claims a marker; further resends to the
 * same address on the same role set are refused until it expires. The window
 * is keyed by (role set, lowercased address) — never by the invitation ID —
 * so revoking an invitation and re-inviting the address (which mints a new
 * invitation ID) does not reset it. The address enters the key only as a
 * SHA-256 digest, so no address is stored in Redis keys. Resending to one
 * person does not affect another's window.
 *
 * Fails open: a Redis error admits the resend (and logs), because an extra
 * email during a store outage is preferable to an admin being unable to
 * re-send an invitation at all.
 */
@Injectable()
export class PlatformInvitationResendThrottleService {
  private readonly windowSeconds: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const configured = this.configService.get(
      'notifications.platform_invitations.resend_cooldown_seconds',
      { infer: true }
    );
    const { value, valid } = positiveIntegerOrDefault(
      configured,
      DEFAULT_RESEND_COOLDOWN_SECONDS
    );
    // An unusable value (0, fractional, non-numeric) would make every marker
    // write fail and the fail-open path would silently disable the throttle.
    if (!valid) {
      this.logger.warn?.(
        {
          message:
            'Invalid platform-invitation resend cooldown configuration — using the default',
          configured: String(configured),
          defaultSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
        },
        LogContext.ROLES
      );
    }
    this.windowSeconds = value;
  }

  /**
   * Returns `true` and claims the window when a resend is allowed; returns
   * `false` when that address was resent on that role set within the window.
   */
  async claim(roleSetID: string, email: string): Promise<boolean> {
    const addressDigest = createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');
    const key = `platform-invitation:resend:${roleSetID}:${addressDigest}`;
    try {
      // SET EX NX is atomic: the marker and its TTL are written together, and
      // only when no marker exists.
      const result = await this.redis.set(
        key,
        '1',
        'EX',
        this.windowSeconds,
        'NX'
      );
      return result === 'OK';
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Platform-invitation resend throttle store error — failing open',
          roleSetID,
          error: error?.message,
        },
        error?.stack,
        LogContext.ROLES
      );
      return true;
    }
  }
}
