import RedisStore from 'connect-redis';
import type { Redis } from 'ioredis';

export const SESSION_KEY_PREFIX = 'alkemio:sid:';
// Session TTLs are NOT hardcoded here — both the sliding idle window
// (`oidc.cookie.idle_ttl_s`) and the absolute ceiling (`oidc.cookie.absolute_ttl_s`)
// are config-driven (defaults live in alkemio.yml) and injected via ConfigService.
// FR-022c — tombstone TTL (5 min). Long enough that the next request from a
// browser tab that still holds the cookie reads it; short enough that Redis
// frees the key promptly. Tombstoned payloads are NOT considered valid by the
// cookie-session strategy — they trip CookieSessionInvalidError → 401.
export const SESSION_TOMBSTONE_TTL_S = 300;

export type AlkemioSessionPayload = {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_at: number;
  absolute_expires_at: number;
  sub: string;
  alkemio_actor_id?: string | null;
  refresh_failure_count: number;
  refresh_failure_streak_started_at: number | null;
  last_refreshed_at?: number | null;
  // FR-018 — epoch-seconds of the last lazy idle renewal (see
  // buildSessionRenewalMiddleware). Distinct from `last_refreshed_at`, which
  // tracks OIDC token rotation.
  last_extended_at?: number | null;
  created_at: number;
  client_id: string;
  request_context_cache?: { display_name?: string; email?: string } | null;
  // FR-022c — when set, the session has been torn down by the BFF (e.g. due
  // to persistent refresh failure). Strategy treats payload as invalid;
  // distinguishes "had-a-session-now-invalid" (state b → 401) from
  // "never-had-a-session" (state a → anonymous).
  terminated_at?: number | null;
  terminated_reason?: string | null;
};

export type SessionStoreHandle = {
  get(sessionId: string): Promise<AlkemioSessionPayload | null>;
  destroy(sessionId: string): Promise<void>;
  // FR-022c — replace the payload with a tombstone (short TTL) so the next
  // request from the same cookie distinguishes torn-down (state b) from
  // never-existed (state a). Logout still uses `destroy`; only system-side
  // teardowns (refresh failure thresholds) call `markTerminated`. The caller
  // SHOULD pass `context` carrying sub/client_id captured BEFORE any prior
  // express-session destroy — once destroy runs the Redis key is gone and
  // markTerminated can no longer rehydrate context from the existing payload.
  markTerminated(
    sessionId: string,
    reason: string,
    context?: { sub?: string; client_id?: string }
  ): Promise<void>;
};

// FR-018 / FR-020a — connect-redis store used by express-session. The session
// is persisted through `req.session.save()` on the login callback, on `/refresh`,
// and on lazy idle renewal (see buildSessionRenewalMiddleware), so THIS store
// (not `buildSessionStore` below) governs the Redis key lifetime in practice.
//
// connect-redis derives the key TTL from `sess.cookie.expires` by default
// (RedisStore._getTTL). Passing `ttl` as a FUNCTION short-circuits that cookie
// path, letting us key the TTL off the 14-day idle window instead — capped by the
// remaining time to the 30-day absolute ceiling so an abandoned key never lingers
// past the ceiling. `disableTouch:true` keeps express-session from extending the
// key on every read; renewal happens lazily and explicitly instead.
export function buildOidcSessionRedisStore(
  client: Redis,
  idleTtlS: number
): RedisStore {
  return new RedisStore({
    client,
    prefix: SESSION_KEY_PREFIX,
    ttl: (sess: { absolute_expires_at?: number } | undefined) => {
      const nowS = Math.floor(Date.now() / 1000);
      const ceilingRemainingS =
        typeof sess?.absolute_expires_at === 'number'
          ? sess.absolute_expires_at - nowS
          : idleTtlS;
      // At least 1s so connect-redis writes an EX (0/negative would delete).
      return Math.max(1, Math.min(idleTtlS, ceilingRemainingS));
    },
    disableTouch: true,
  });
}

// FR-018 — lazy idle renewal. A naive rolling session re-issues the cookie and
// re-writes Redis on EVERY request (one Set-Cookie + one Redis write per call).
// Instead we mirror Ory Kratos `earliest_possible_extend`: only renew once the
// session is in the back half of its idle window. Mutating `last_extended_at`
// marks the session dirty so express-session persists it (resetting the Redis
// key TTL via the store's `ttl` fn) and re-issues the cookie with a fresh
// `maxAge`. An active user triggers ~1 renewal per `idleTtlS/2`; between
// renewals the request does zero extra writes. `rolling` MUST be false so
// express-session does not also re-issue the cookie on untouched requests.
type RenewableSession = {
  sub?: string;
  terminated_at?: number | null;
  last_extended_at?: number | null;
  absolute_expires_at?: number;
  cookie?: { maxAge?: number | null };
};

export function buildSessionRenewalMiddleware(idleTtlS: number) {
  const idleMs = idleTtlS * 1000;
  const renewBelowMs = idleMs / 2; // renew only in the back half of the window
  return (
    req: { session?: RenewableSession },
    _res: unknown,
    next: () => void
  ): void => {
    const s = req.session;
    // Only established, non-terminated OIDC sessions are renewable.
    if (!s || !s.sub || s.terminated_at) {
      next();
      return;
    }
    const remainingMs =
      typeof s.cookie?.maxAge === 'number' ? s.cookie.maxAge : 0;
    if (remainingMs > renewBelowMs) {
      next(); // still fresh — no work
      return;
    }
    // Back half reached: slide the idle window. Cap at the time left to the
    // absolute ceiling so the cookie (and the Redis key TTL, capped identically
    // by the store) never claim to outlive `absolute_expires_at` — near the
    // ceiling the window shrinks to the remainder, then re-login is required.
    const nowMs = Date.now();
    const ceilingRemainingMs =
      typeof s.absolute_expires_at === 'number'
        ? s.absolute_expires_at * 1000 - nowMs
        : idleMs;
    if (s.cookie)
      s.cookie.maxAge = Math.max(1, Math.min(idleMs, ceilingRemainingMs));
    s.last_extended_at = Math.floor(nowMs / 1000);
    next();
  };
}

// FR-018 / FR-020a — Redis read/teardown handle over the same `alkemio:sid:<sid>`
// keys that express-session (connect-redis) writes. The strategy and forward-auth
// read via `get`; logout/refresh-teardown use `destroy`/`markTerminated`. Writes
// (and thus key TTL) are owned by express-session, not this handle.
export function buildSessionStore(redis: Redis): SessionStoreHandle {
  return {
    async get(sessionId) {
      const raw = await redis.get(SESSION_KEY_PREFIX + sessionId);
      if (raw === null) return null;
      return JSON.parse(raw) as AlkemioSessionPayload;
    },
    async destroy(sessionId) {
      await redis.del(SESSION_KEY_PREFIX + sessionId);
    },
    async markTerminated(sessionId, reason, context) {
      // Caller MAY have already destroyed the Redis key (e.g. via
      // express-session.destroy) — in that case we rely on `context` for
      // sub/client_id. If the key still holds a payload, prefer its values.
      const raw = await redis.get(SESSION_KEY_PREFIX + sessionId);
      const now = Date.now();
      const base: Partial<AlkemioSessionPayload> = raw
        ? (JSON.parse(raw) as AlkemioSessionPayload)
        : {};
      const tombstone: AlkemioSessionPayload = {
        access_token: '',
        id_token: '',
        refresh_token: '',
        expires_at: 0,
        absolute_expires_at: 0,
        sub: base.sub ?? context?.sub ?? '',
        alkemio_actor_id: null,
        refresh_failure_count: base.refresh_failure_count ?? 0,
        refresh_failure_streak_started_at:
          base.refresh_failure_streak_started_at ?? null,
        last_refreshed_at: base.last_refreshed_at ?? null,
        created_at: base.created_at ?? now,
        client_id: base.client_id ?? context?.client_id ?? '',
        request_context_cache: null,
        terminated_at: now,
        terminated_reason: reason,
      };
      await redis.set(
        SESSION_KEY_PREFIX + sessionId,
        JSON.stringify(tombstone),
        'EX',
        SESSION_TOMBSTONE_TTL_S
      );
    },
  };
}
