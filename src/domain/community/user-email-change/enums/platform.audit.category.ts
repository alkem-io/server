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
}
