import type { Redis } from 'ioredis';

export const SESSION_KEY_PREFIX = 'alkemio:sid:';
export const SESSION_ABSOLUTE_TTL_S = 14 * 24 * 60 * 60; // 14 days

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
};

export type SessionStoreHandle = {
  get(sessionId: string): Promise<AlkemioSessionPayload | null>;
  create(sessionId: string, payload: AlkemioSessionPayload): Promise<void>;
  update(sessionId: string, payload: AlkemioSessionPayload): Promise<void>;
  destroy(sessionId: string): Promise<void>;
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
  };
}
