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
 * inline inside the OIDC module (then `oidc.module.ts`; the provider moved to
 * `oidc-core.module.ts` in server#6324). Hoisting the client behind this token
 * means the store handle and the per-subject index share one connection instead
 * of opening a second.
 *
 * Since server#6332 the client behind this token is built by
 * `src/core/redis/redis.client.factory.ts`, which is the single construction
 * point for every `ioredis` client in the codebase. Do not construct one here,
 * or anywhere else: the factory's fail-fast options are what stop a Redis
 * outage becoming a ~42 s hang, and a second hand-rolled client is exactly how
 * that regression returns.
 */
export const OIDC_REDIS_CLIENT = Symbol('OIDC_REDIS_CLIENT');
