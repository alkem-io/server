/**
 * Cross-feature discriminator for `platform_audit_entry` rows. The email-change
 * feature is the first consumer; future ISO 27001 audit categories
 * (`authentication`, `access_control`, `data_privacy`, `configuration_change`, ...)
 * extend this enum additively without a DDL migration on the audit table.
 *
 * Postgres-mapped via `enumName: 'platform_audit_category'`.
 */
export enum PlatformAuditCategory {
  EMAIL_CHANGE = 'email_change',
  PASSWORD_CHANGE = 'password_change',
  // Operational & maintenance mutation family (workspace#032): one row per
  // execution of a gated platform-operations mutation, regardless of which
  // role authorized it.
  PLATFORM_OPERATIONS = 'platform_operations',
  // --- 027-platform-role-redesign (T016/T019): four new categories ---
  /** Role grant/revoke/rejection (A1/A2/A20-adjacent). Fail-closed when
   * operator-initiated; fail-open when bootstrap-seeded (FR-027). Also
   * carries A21's rejected service-profile attempts (eighth pass). */
  PLATFORM_ROLE_ASSIGNMENT = 'platform_role_assignment',
  /** User-record family (A4/A5): email change (already EMAIL_CHANGE),
   * identity/account deletion & reset. */
  PLATFORM_USER_RECORD = 'platform_user_record',
  /** Platform settings / licensing-framework definition (A10/A13). */
  PLATFORM_CONFIGURATION = 'platform_configuration',
  /** Resource moves, container deletions, visibility changes, license usage
   * assignment (A8/A9/A12/A14). */
  PLATFORM_RESOURCE = 'platform_resource',
}
