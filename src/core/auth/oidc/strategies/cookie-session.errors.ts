// FR-022b — distinct error type so the strategy can signal "session store
// unreachable" without conflating it with "no/expired session" (which yields
// 401 + cookie clearance). The exception filter and the express error
// middleware both branch on `instanceof SessionStoreUnavailableError`.
export class SessionStoreUnavailableError extends Error {
  constructor(public readonly cause?: unknown) {
    super('session_store_unavailable');
    this.name = 'SessionStoreUnavailableError';
  }
}

export type CookieSessionContext = {
  sub: string;
  alkemio_actor_id: string | null;
  client_id: string;
};

export const SESSION_STORE_HANDLE = Symbol('OIDC_SESSION_STORE_HANDLE');

/**
 * Session cookie name. Picks up the `OIDC_SESSION_COOKIE_NAME` env var that
 * per-env overlays set (`alkemio_session_sandbox`, `alkemio_session_test`, …)
 * via the alkemio-config ConfigMap; falls back to the alkemio.yml default
 * `alkemio_session` for local dev / unset environments.
 *
 * Read once at module load — process env is populated before the Nest
 * bootstrap runs.
 */
export const COOKIE_SESSION_NAME =
  process.env.OIDC_SESSION_COOKIE_NAME?.trim() || 'alkemio_session';
