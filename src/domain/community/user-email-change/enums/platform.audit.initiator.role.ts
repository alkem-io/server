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
  /** Coarse administrative tier.
   *  - Role attribution (`resolveInitiatorRole`) never produces it.
   *  - The coarse-tier writers still write it by design: every
   *    platform-operations audit row (`platform.operations.audit.service.ts`),
   *    admin account deletion (`registration.service.ts`), admin MCP API-key
   *    revocation (`mcp-api-key.service.ts`) and admin email-change events
   *    (`user.email.change.service.ts`).
   *  - Historical role-attribution rows written while legacy broad
   *    credentials still existed carry it.
   *  - The Postgres enum value is kept, so all of those rows stay valid. */
  PLATFORM_ADMIN = 'platform_admin',
  /** Coarse tier. Also used for a bootstrap-SEEDED write with no actor at
   * all. */
  SYSTEM = 'system',
  SERVICE = 'service',
  // --- 027-platform-role-redesign (T018/T019): the ten real platform roles ---
  PLATFORM_ROLES_ADMIN = 'platform_roles_admin',
  PLATFORM_CONTENT_FULL_ACCESS = 'platform_content_full_access',
  PLATFORM_RESOURCE_ADMIN = 'platform_resource_admin',
  PLATFORM_SETTINGS_ADMIN = 'platform_settings_admin',
  PLATFORM_OPERATIONS_ADMIN = 'platform_operations_admin',
  PLATFORM_USERS_ADMIN = 'platform_users_admin',
  PLATFORM_SUPPORT = 'platform_support',
  PLATFORM_LICENSE_MANAGER = 'platform_license_manager',
  PLATFORM_SPACES_READER = 'platform_spaces_reader',
  PLATFORM_AUDIT_READER = 'platform_audit_reader',
}
