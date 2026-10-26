import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the cross-category audit enum with `organization_administration`:
 * one row per organisation Community-tab action (invite, resend, revoke,
 * promote, demote, remove, approve, reject, and the accept-time honouring or
 * withholding of an offered role) taken through the Platform Support path.
 *
 * No new outcome values — the action name lives in `details` and the existing
 * `role_granted` / `role_revoked` / `operation_succeeded` outcomes are reused.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is additive and idempotent (same
 * shape as `1786500000000-AddMcpApiKeyAuditCategory`); no table DDL, existing
 * rows unaffected. Must run before the server writes the first row of this
 * category — the standard `migration:run`-then-start sequence guarantees that.
 */
export class AddOrganizationAdministrationAuditCategory1791200000000
  implements MigrationInterface
{
  name = 'AddOrganizationAdministrationAuditCategory1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'organization_administration'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. Removing the value safely
    // would require recreating the enum type and rewriting every
    // `platform_audit_entry` row referencing it. No-op — enum extensions are
    // forward-only, matching the earlier audit-category migrations.
  }
}
