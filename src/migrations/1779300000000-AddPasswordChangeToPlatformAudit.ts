import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the cross-category audit enums introduced in
 * `1779195577000-CreatePlatformAuditEntry` with the password-change observer
 * vocabulary:
 *
 * - `platform_audit_category` gains `password_change`.
 * - `platform_audit_outcome` gains `observed` (a Kratos-side password change
 *   was observed and recorded by the platform).
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is the non-breaking, additive
 * pattern noted in the original enum's design doc; existing rows are
 * unaffected. The reverse step is best-effort (Postgres does not support
 * removing a single enum value without recreating the type).
 */
export class AddPasswordChangeToPlatformAudit1779300000000
  implements MigrationInterface
{
  name = 'AddPasswordChangeToPlatformAudit1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'password_change'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'observed'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. Removing these values
    // safely would require recreating the enum types (rewriting every
    // `platform_audit_entry` row and any other column referencing them).
    // No-op here; data-model.md treats enum extensions as effectively
    // forward-only.
  }
}
