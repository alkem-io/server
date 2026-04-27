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
export const COOKIE_SESSION_NAME = 'alkemio_session';
