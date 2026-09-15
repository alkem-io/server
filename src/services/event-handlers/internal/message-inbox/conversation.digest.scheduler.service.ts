import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  buildDigestConfig,
  DigestConfig,
  digestStateTtlSeconds,
} from './conversation.digest.config';
import {
  DIGEST_DUE_KEY,
  DigestTrack,
  digestAttemptsKey,
  digestFirstKey,
  digestPendingKey,
  digestTrackKey,
} from './conversation.digest.track';

/**
 * ARM — data-model §5.1. One atomic script per (recipient, track), run on
 * message arrival.
 *
 * The three keys must move together or the cap anchor and the due entry can
 * disagree, so this is a single script (one round trip, replica-safe).
 *
 * `ZADD` without NX/GT deliberately OVERWRITES the score — that overwrite IS
 * the debounce reset. `math.min` against the first-seen anchor IS the FR-011b
 * cap. The anchor is written with SET only when absent and is cleared only on
 * flush, so a burst of messages cannot push the fire time past the cap.
 *
 * KEYS: 1=due zset  2=pending set  3=first-seen key
 * ARGV: 1=track  2=conversationId  3=nowMs  4=quietMs  5=maxDelayMs  6=stateTtlSec
 */
export const DIGEST_ARM_LUA = `
local first = redis.call('GET', KEYS[3])
if not first then
  first = ARGV[3]
  redis.call('SET', KEYS[3], first, 'EX', ARGV[6])
end
local fireAt = math.min(tonumber(ARGV[3]) + tonumber(ARGV[4]),
                        tonumber(first)   + tonumber(ARGV[5]))
redis.call('ZADD', KEYS[1], fireAt, ARGV[1])
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[6])
return fireAt
`;

/**
 * READ-AND-CLEAR — data-model §5.3. Drains the pending set and the cap anchor
 * in one round trip.
 *
 * State is cleared BEFORE dispatch so a crash cannot re-send; the cost is a
 * possible lost dispatch, bounded by the re-arm in §5.4 and — beyond that —
 * self-healing, because the messages stay unread and the next message on this
 * track re-arms the timer.
 *
 * The attempts counter is deliberately NOT cleared here: it must survive the
 * read so a repeatedly failing dispatch is bounded rather than looping.
 *
 * KEYS: 1=pending set  2=first-seen key
 */
export const DIGEST_READ_AND_CLEAR_LUA = `
local ids = redis.call('SMEMBERS', KEYS[1])
local first = redis.call('GET', KEYS[2])
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
return { ids, first or '' }
`;

/**
 * RE-ARM — data-model §5.4. Bounded dispatch retry.
 *
 * Increments the attempt counter first and refuses to re-arm once
 * `maxAttempts` is exhausted (returning 0), so the caller can drop and log.
 * Restores exactly what `readAndClear` drained: the pending conversations and
 * the cap anchor, plus a due entry at `now + backoff`.
 *
 * KEYS: 1=due zset  2=pending set  3=first-seen key  4=attempts key
 * ARGV: 1=track  2=fireAtMs  3=firstAtMs  4=stateTtlSec  5=maxAttempts  6..=conversationIds
 */
export const DIGEST_RE_ARM_LUA = `
local attempts = redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], ARGV[4])
if attempts > tonumber(ARGV[5]) then
  redis.call('DEL', KEYS[4])
  return 0
end
for i = 6, #ARGV do
  redis.call('SADD', KEYS[2], ARGV[i])
end
redis.call('EXPIRE', KEYS[2], ARGV[4])
redis.call('SET', KEYS[3], ARGV[3], 'EX', ARGV[4])
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
return attempts
`;

const ARM_COMMAND = 'msgDigestArm';
const READ_AND_CLEAR_COMMAND = 'msgDigestReadAndClear';
const RE_ARM_COMMAND = 'msgDigestReArm';

type RedisWithDigestCommands = Redis & {
  [ARM_COMMAND]: (...args: (string | number)[]) => Promise<number>;
  [READ_AND_CLEAR_COMMAND]: (
    ...args: (string | number)[]
  ) => Promise<[string[], string]>;
  [RE_ARM_COMMAND]: (...args: (string | number)[]) => Promise<number>;
};

export interface DigestPendingState {
  conversationIds: string[];
  /** ms epoch of the first un-notified message, or null if the anchor was lost. */
  firstAtMs: number | null;
}

/**
 * 034-messaging-notifications — Operator Ruling R4 / D-25.
 *
 * Owns the Redis structures of data-model §5.1–§5.4: the due ZSET, the
 * per-track pending conversation set, the first-seen cap anchor, and the
 * bounded retry counter.
 *
 * Every method FAILS OPEN and logs (D-10). An `arm` failure must not break
 * message ingestion; a `claimDue` failure must not kill the sweep tick. The
 * design tolerates this because pending state is a scheduling HINT only
 * (FR-022) — digest counts are re-derived at fire time from the authoritative
 * unread signal, so losing this state degrades timing, never content.
 */
@Injectable()
export class ConversationDigestSchedulerService {
  public readonly config: DigestConfig;

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    // Throws on a violated invariant — a fail-fast at boot is strictly better
    // than tracks that silently never fire (data-model §6).
    this.config = buildDigestConfig(
      configService.get('notifications.messaging.digest', { infer: true })
    );

    // EVALSHA-backed (ioredis falls back to EVAL on NOSCRIPT), so the hot
    // arrival path does not ship the script body on every message.
    this.redis.defineCommand(ARM_COMMAND, {
      numberOfKeys: 3,
      lua: DIGEST_ARM_LUA,
    });
    this.redis.defineCommand(READ_AND_CLEAR_COMMAND, {
      numberOfKeys: 2,
      lua: DIGEST_READ_AND_CLEAR_LUA,
    });
    this.redis.defineCommand(RE_ARM_COMMAND, {
      numberOfKeys: 4,
      lua: DIGEST_RE_ARM_LUA,
    });
  }

  private get client(): RedisWithDigestCommands {
    return this.redis as RedisWithDigestCommands;
  }

  /**
   * Arms (or resets) the debounce timer for one track and records the
   * conversation to examine at flush. Idempotent per conversation: a second
   * arm for the same conversation adds nothing to the pending SET, resets the
   * due score, and leaves the first-seen anchor untouched.
   */
  async arm(
    track: DigestTrack,
    conversationId: string,
    nowMs: number = Date.now()
  ): Promise<void> {
    const trackKey = digestTrackKey(track);
    const windows = this.config.windows[track.channel][track.kind];
    try {
      await this.client[ARM_COMMAND](
        DIGEST_DUE_KEY,
        digestPendingKey(trackKey),
        digestFirstKey(trackKey),
        trackKey,
        conversationId,
        nowMs,
        windows.quietPeriodSeconds * 1000,
        windows.maxDelaySeconds * 1000,
        digestStateTtlSeconds(windows)
      );
    } catch (error: any) {
      // Fails open: the message is delivered regardless, and the NEXT message
      // on this track re-arms the timer with the true unread counts (FR-022).
      this.logger.error?.(
        {
          message: 'Digest arm failed - message will not be debounced',
          trackKey,
          conversationId,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }
  }

  /**
   * FR-021 / D-25 — claims the tracks whose fire time has passed.
   *
   * Every replica sweeps; `ZREM` returning 1 IS the claim, so exactly one
   * replica flushes each due track. No lock, no leader election. A replica
   * that loses the race gets 0 and skips.
   */
  async claimDue(nowMs: number, limit: number): Promise<string[]> {
    let candidates: string[];
    try {
      candidates = await this.redis.zrangebyscore(
        DIGEST_DUE_KEY,
        '-inf',
        nowMs,
        'LIMIT',
        0,
        limit
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Digest due-queue read failed - skipping this tick',
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return [];
    }

    const claimed: string[] = [];
    for (const trackKey of candidates) {
      try {
        const removed = await this.redis.zrem(DIGEST_DUE_KEY, trackKey);
        if (removed === 1) {
          claimed.push(trackKey);
        }
      } catch (error: any) {
        // Not claimed -> not flushed by this replica. The track keeps its due
        // entry and is retried on the next tick.
        this.logger.error?.(
          {
            message: 'Digest track claim failed - leaving it for a later tick',
            trackKey,
            error: error?.message,
          },
          error?.stack,
          LogContext.NOTIFICATIONS
        );
      }
    }
    return claimed;
  }

  /**
   * Drains the pending conversation set and the cap anchor for a claimed
   * track. Fails CLOSED (returns nothing pending) — an unreadable pending set
   * cannot be dispatched from, and the state self-heals on the next message.
   */
  async readAndClear(trackKey: string): Promise<DigestPendingState> {
    try {
      const [conversationIds, firstAt] = await this.client[
        READ_AND_CLEAR_COMMAND
      ](digestPendingKey(trackKey), digestFirstKey(trackKey));
      const parsedFirstAt = Number(firstAt);
      return {
        conversationIds: conversationIds ?? [],
        firstAtMs:
          Number.isFinite(parsedFirstAt) && firstAt ? parsedFirstAt : null,
      };
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Digest pending-state read failed - nothing to flush',
          trackKey,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return { conversationIds: [], firstAtMs: null };
    }
  }

  /**
   * data-model §5.4 — re-arms a track whose dispatch threw.
   *
   * @returns true if the track was re-armed; false if the attempt budget is
   * exhausted (the caller must then drop it and log an error) or the store
   * failed.
   */
  async reArm(
    track: DigestTrack,
    trackKey: string,
    conversationIds: string[],
    firstAtMs: number,
    nowMs: number = Date.now()
  ): Promise<boolean> {
    const windows = this.config.windows[track.channel][track.kind];
    try {
      const attempts = await this.client[RE_ARM_COMMAND](
        DIGEST_DUE_KEY,
        digestPendingKey(trackKey),
        digestFirstKey(trackKey),
        digestAttemptsKey(trackKey),
        trackKey,
        nowMs + this.config.retryBackoffSeconds * 1000,
        firstAtMs,
        digestStateTtlSeconds(windows),
        this.config.maxDispatchAttempts,
        ...conversationIds
      );
      return attempts > 0;
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Digest re-arm failed - dropping this dispatch',
          trackKey,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
      return false;
    }
  }

  /**
   * Clears the bounded-retry counter. Called on every TERMINAL outcome for a
   * track — dispatched, or deliberately not dispatched — so the budget always
   * applies to a single logical digest rather than to the recipient's
   * lifetime.
   */
  async clearAttempts(trackKey: string): Promise<void> {
    try {
      await this.redis.del(digestAttemptsKey(trackKey));
    } catch (error: any) {
      // Harmless: the key carries a TTL, so a missed delete self-corrects.
      this.logger.warn?.(
        {
          message: 'Digest attempt-counter clear failed',
          trackKey,
          error: error?.message,
        },
        LogContext.NOTIFICATIONS
      );
    }
  }
}
