// FR-024b — three-state auth resolution. The interceptor maps:
//   - SessionStoreUnavailableError (cookie-session.errors.ts) → 503 + Retry-After:5
//   - BearerValidationError | CookieSessionInvalidError (this file) → 401 UNAUTHENTICATED
//   - null/undefined return from strategy.validate → state-(a) anonymous, 200 OK
// Strategies throw these classes when credentials are PRESENT but INVALID
// (state b). Strategies return null when credentials are ABSENT (state a).
// Audit emission lives at the strategy throw site so the interceptor mapper
// does NOT re-emit (single source of truth per FR-035).

export class BearerValidationError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly correlationId?: string,
    public readonly cause?: unknown
  ) {
    super(`bearer_validation_failed:${errorCode}`);
    this.name = 'BearerValidationError';
  }
}

export class CookieSessionInvalidError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly correlationId?: string,
    public readonly cause?: unknown
  ) {
    super(`cookie_session_invalid:${errorCode}`);
    this.name = 'CookieSessionInvalidError';
  }
}

// Thrown by the two sign-in strategies when a second-factor rule refuses the
// actor. The session is valid, so the cookie is never cleared for it.
export class SecondFactorRequiredError extends Error {
  constructor() {
    super('second_factor_required');
    this.name = 'SecondFactorRequiredError';
  }
}
