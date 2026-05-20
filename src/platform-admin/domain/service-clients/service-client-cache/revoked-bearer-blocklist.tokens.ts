/**
 * 004 T030 — DI tokens for the single-bearer revoke blocklist.
 *
 * Split into its own file so the service module can publish a second
 * descriptive alias (`REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE`) without a
 * circular import.
 */
export const SERVICE_CLIENT_BLOCKLIST_REDIS_HANDLE = Symbol(
  'SERVICE_CLIENT_BLOCKLIST_REDIS_HANDLE'
);
export const REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE = Symbol(
  'REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE'
);
