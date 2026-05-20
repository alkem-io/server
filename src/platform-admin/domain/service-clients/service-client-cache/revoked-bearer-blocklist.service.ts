import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import { REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE } from './revoked-bearer-blocklist.tokens';

/**
 * 004 T030 — `RevokedBearerBlocklistService` (research.md R-4,
 * data-model.md §6, FR-011a / FR-014).
 *
 * RFC 7009 `/oauth2/revoke` propagation tombstones a bearer's `jti` in
 * Redis with a TTL equal to its remaining access-token-lifetime (capped
 * at 900 s, matching the FR-012 ATL ceiling). The blocklist is checked
 * by the FR-024 bearer strategy on every service-principal request;
 * presence ⇒ reject with 401 + `auth.bearer.token_revoked`.
 *
 * Tombstones self-expire (no GC), bounded at ~100 keys in the steady
 * state per research R-4 envelope.
 */

const BLOCKLIST_KEY_PREFIX = 'alkemio:svc:revoked-bearer:';
const BLOCKLIST_MAX_TTL_SECONDS = 900;
const BLOCKLIST_TOMBSTONE_VALUE = '1';

export const revokedBearerBlocklistKey = (jti: string): string =>
  `${BLOCKLIST_KEY_PREFIX}${jti}`;

@Injectable()
export class RevokedBearerBlocklistService {
  private readonly logger = new Logger(RevokedBearerBlocklistService.name);

  constructor(
    @Inject(REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE)
    private readonly redis: Redis
  ) {}

  /**
   * Tombstones `jti` for `remainingSeconds` (capped to 900 s ceiling).
   * Non-positive `remainingSeconds` are treated as 1 s to ensure the
   * tombstone exists for at least one round of admission checks.
   */
  async tombstone(jti: string, remainingSeconds: number): Promise<void> {
    if (!jti || typeof jti !== 'string') return;
    const ttl = Math.min(
      Math.max(1, Math.floor(remainingSeconds)),
      BLOCKLIST_MAX_TTL_SECONDS
    );
    try {
      await this.redis.set(
        revokedBearerBlocklistKey(jti),
        BLOCKLIST_TOMBSTONE_VALUE,
        'EX',
        ttl
      );
    } catch (err) {
      this.logger.warn(
        `Redis SET failed for revoked bearer ${jti}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      // Surface the failure — caller (FR-011a propagation path) must
      // treat the revoke as not yet effective at the admission gate.
      throw err;
    }
  }

  async isBlocked(jti: string): Promise<boolean> {
    if (!jti || typeof jti !== 'string') return false;
    try {
      const exists = await this.redis.exists(revokedBearerBlocklistKey(jti));
      return exists === 1;
    } catch (err) {
      this.logger.warn(
        `Redis EXISTS failed for revoked bearer ${jti}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      // Fail-closed: if the blocklist is unreachable we cannot prove the
      // bearer is NOT revoked, so treat as blocked. Admission gate
      // surfaces this as 401 + `auth.bearer.token_revoked` (per FR-014
      // "admit on stale or absent metadata" forbidden).
      return true;
    }
  }
}
