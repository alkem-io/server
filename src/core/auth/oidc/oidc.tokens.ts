/**
 * DI token for the single shared `ioredis` client used by the OIDC session
 * layer.
 *
 * Kept in its own file (rather than in `oidc-core.module.ts`) so consumers can
 * import the token without importing the module, which is what keeps
 * `OidcSessionRevocationService` free of a circular import back to its own
 * module.
 *
 * Before server#6315 the session-store handle constructed its own `new Redis()`
 * inline inside `oidc.module.ts`. Hoisting the client behind this token means
 * the store handle and the per-subject index share one connection instead of
 * opening a second.
 */
export const OIDC_REDIS_CLIENT = Symbol('OIDC_REDIS_CLIENT');
