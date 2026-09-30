import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Per-invitation cooldown for resending a platform invitation email.
 *
 * The first resend inside a window claims a marker; further resends of the
 * same invitation are refused until it expires. The window is keyed by the
 * invitation, never by the address or the actor, so resending one person's
 * invitation does not affect another's.
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
    this.windowSeconds = this.configService.get(
      'notifications.platform_invitations.resend_cooldown_seconds',
      { infer: true }
    );
  }

  /**
   * Returns `true` and claims the window when a resend is allowed; returns
   * `false` when the invitation was resent within the window.
   */
  async claim(invitationID: string): Promise<boolean> {
    const key = `platform-invitation:resend:${invitationID}`;
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
          invitationID,
          error: error?.message,
        },
        error?.stack,
        LogContext.ROLES
      );
      return true;
    }
  }
}
