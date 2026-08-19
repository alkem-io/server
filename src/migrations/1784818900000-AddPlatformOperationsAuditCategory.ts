import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#032-platform-ops-admin-role (Platform Operations Admin): extends
 * the cross-category audit enums introduced in
 * `1779195577000-CreatePlatformAuditEntry` with the platform-operations
 * vocabulary (FR-016):
 *
 * - `platform_audit_category` gains `platform_operations` — one row per
 *   execution of a gated operational/maintenance mutation.
 * - `platform_audit_outcome` gains `operation_succeeded` / `operation_failed`.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is the non-breaking, additive
 * pattern (same shape as `1779300000000-AddPasswordChangeToPlatformAudit`);
 * no table DDL, existing rows unaffected.
 */
export class AddPlatformOperationsAuditCategory1784818900000
  implements MigrationInterface
{
  name = 'AddPlatformOperationsAuditCategory1784818900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'platform_operations'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'operation_succeeded'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'operation_failed'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. Removing these values
    // safely would require recreating the enum types (rewriting every
    // `platform_audit_entry` row referencing them). No-op — enum extensions
    // are treated as forward-only, matching the password-change precedent.
  }
}
