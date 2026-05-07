import type { Redis } from 'ioredis';

export const SESSION_KEY_PREFIX = 'alkemio:sid:';
export const SESSION_ABSOLUTE_TTL_S = 14 * 24 * 60 * 60; // 14 days
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
  create(sessionId: string, payload: AlkemioSessionPayload): Promise<void>;
  update(sessionId: string, payload: AlkemioSessionPayload): Promise<void>;
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

// FR-018 / FR-020a — Redis string store. Keys are `alkemio:sid:<sid>`. TTL is
// set once at create (EX 1209600) and NEVER extended. `absolute_expires_at`
// on the payload is the authoritative check; the key TTL is a reap backstop.
export function buildSessionStore(redis: Redis): SessionStoreHandle {
  return {
    async get(sessionId) {
      const raw = await redis.get(SESSION_KEY_PREFIX + sessionId);
      if (raw === null) return null;
      return JSON.parse(raw) as AlkemioSessionPayload;
    },
    async create(sessionId, payload) {
      await redis.set(
        SESSION_KEY_PREFIX + sessionId,
        JSON.stringify(payload),
        'EX',
        SESSION_ABSOLUTE_TTL_S
      );
    },
    async update(sessionId, payload) {
      // KEEPTTL — MUST NOT reset the 14-day ceiling.
      await redis.set(
        SESSION_KEY_PREFIX + sessionId,
        JSON.stringify(payload),
        'KEEPTTL'
      );
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
