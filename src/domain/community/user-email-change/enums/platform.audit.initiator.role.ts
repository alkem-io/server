/**
 * Cross-category Postgres enum (`platform_audit_initiator_role`). Ships with all
 * four values upfront so future ISO 27001 categories that need to record non-human
 * initiators (scheduled jobs, internal services) do not require an enum migration.
 *
 * - `SELF` / `PLATFORM_ADMIN` — string values are identical to the feature-scoped
 *   GraphQL `UserEmailChangeInitiatorRole` enum for those two members so the
 *   projection layer narrows without value translation.
 * - `SYSTEM` / `SERVICE` — reserved for future categories; the email-change
 *   projection never exposes these (the GraphQL enum only has `SELF` and
 *   `PLATFORM_ADMIN`).
 */
export enum PlatformAuditInitiatorRole {
  SELF = 'self',
  PLATFORM_ADMIN = 'platform_admin',
  SYSTEM = 'system',
  SERVICE = 'service',
}
