import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export type PlatformInvitationEmailBudgetOutcome = 'ok' | 'actor' | 'roleSet';

const WINDOW_SECONDS = 3600;

/**
 * Both counters are checked and bumped in one script so a refusal consumes
 * nothing from either budget, and the TTL is written together with the key.
 * Returns 0 (admitted), 1 (actor budget exceeded) or 2 (role set budget
 * exceeded).
 */
const CLAIM_LUA = `
local n = tonumber(ARGV[1])
local actorCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local roleSetCount = tonumber(redis.call('GET', KEYS[2]) or '0')
if actorCount + n > tonumber(ARGV[2]) then return 1 end
if roleSetCount + n > tonumber(ARGV[3]) then return 2 end
if redis.call('INCRBY', KEYS[1], n) == n then redis.call('EXPIRE', KEYS[1], ARGV[4]) end
if redis.call('INCRBY', KEYS[2], n) == n then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
return 0
`;

/**
 * Hourly budget for invitation emails sent to addresses that have no account,
 * counted per acting user and per role set. Creations and resends draw from
 * the same budget, so neither revoking-and-re-inviting nor resending can be
 * used to mail an unbounded number of external addresses.
 *
 * The window is a fixed one-hour epoch bucket suffixed onto the key, so a
 * counter that somehow loses its TTL belongs to an hour that is never written
 * again and cannot throttle anyone permanently.
 *
 * Fails open: a Redis error admits the send (and logs), matching the resend
 * cooldown — an admin must not lose the ability to invite during a store
 * outage.
 */
@Injectable()
export class PlatformInvitationEmailBudgetService {
  private readonly maxPerActorPerHour: number;
  private readonly maxPerRoleSetPerHour: number;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxPerActorPerHour = this.configService.get(
      'notifications.platform_invitations.email_budget_per_actor_per_hour',
      { infer: true }
    );
    this.maxPerRoleSetPerHour = this.configService.get(
      'notifications.platform_invitations.email_budget_per_role_set_per_hour',
      { infer: true }
    );
  }

  /**
   * Claims `count` invitation emails against the actor's and the role set's
   * hourly budgets. Nothing is consumed when either would be exceeded.
   */
  async claim(
    actorID: string,
    roleSetID: string,
    count: number
  ): Promise<PlatformInvitationEmailBudgetOutcome> {
    if (count <= 0) {
      return 'ok';
    }
    const epochHour = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const actorKey = `platform-invitation:email-budget:actor:${actorID}:${epochHour}`;
    const roleSetKey = `platform-invitation:email-budget:roleset:${roleSetID}:${epochHour}`;
    try {
      const outcome = (await this.redis.eval(
        CLAIM_LUA,
        2,
        actorKey,
        roleSetKey,
        String(count),
        String(this.maxPerActorPerHour),
        String(this.maxPerRoleSetPerHour),
        String(WINDOW_SECONDS)
      )) as number;
      if (outcome === 1) return 'actor';
      if (outcome === 2) return 'roleSet';
      return 'ok';
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Platform-invitation email budget store error — failing open',
          actorID,
          roleSetID,
          count,
          error: error?.message,
        },
        error?.stack,
        LogContext.ROLES
      );
      return 'ok';
    }
  }
}
