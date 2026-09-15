import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the cross-category audit enums with the account-deletion
 * vocabulary:
 *
 * - `platform_audit_category` gains `account_deletion` — one primary row per
 *   completed deletion (self-service or platform-admin), plus one appended
 *   row per post-commit external leg.
 * - `platform_audit_outcome` gains `account_deleted` (primary),
 *   `identity_deletion_completed` / `identity_deletion_failed`,
 *   `file_bytes_cleanup_completed` / `file_bytes_cleanup_failed`, and
 *   `session_revocation_completed` (a failed session-revocation leg reuses
 *   the existing `session_invalidation_failed` value rather than adding a
 *   synonym).
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is the non-breaking, additive
 * pattern already used for the platform-operations and MCP-API-key
 * categories; no table DDL, existing rows unaffected. Migration ordering:
 * this must run BEFORE any account-deletion audit row is written — the
 * standard `migration:run`-then-start sequence guarantees that.
 */
export class AddAccountDeletionAuditEnums1788000000000
  implements MigrationInterface
{
  name = 'AddAccountDeletionAuditEnums1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'account_deletion'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'account_deleted'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'identity_deletion_completed'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'identity_deletion_failed'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'file_bytes_cleanup_completed'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'file_bytes_cleanup_failed'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'session_revocation_completed'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. Removing these values
    // safely would require recreating the enum types (rewriting every
    // `platform_audit_entry` row referencing them). No-op — enum extensions
    // are treated as forward-only, matching the platform-operations and
    // MCP-API-key precedents.
  }
}
