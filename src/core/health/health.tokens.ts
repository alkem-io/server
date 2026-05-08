// DI tokens for the HealthModule. Kept in a leaf file (no Nest decorators)
// so they can be imported by `OidcModule` without provoking a circular
// imports graph between health and oidc.

export const HEALTH_REDIS_HANDLE = Symbol('HEALTH_REDIS_HANDLE');
export const HEALTH_JWKS_HANDLE = Symbol('HEALTH_JWKS_HANDLE');
