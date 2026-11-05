import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#091-app-chat-matrix-session: extends the cross-category audit
 * vocabulary with `matrix_session` — one row per minted Matrix chat session
 * (FR-012). The `key_minted` outcome is REUSED (D6), so there is no
 * `platform_audit_outcome` change here.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is the non-breaking, additive
 * pattern (same shape as `1786500000000-AddMcpApiKeyAuditCategory`); no table
 * DDL, no index, existing rows unaffected. Migration ordering: this must run
 * BEFORE any Matrix-session audit row is written — the standard
 * `migration:run`-then-start sequence guarantees that, and the writer is
 * fail-closed, so a mint before the migration refuses rather than silently
 * skipping the row.
 */
export class AddMatrixSessionAuditCategory1791300000000
  implements MigrationInterface
{
  name = 'AddMatrixSessionAuditCategory1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'matrix_session'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. No-op — enum extensions
    // are treated as forward-only, matching the mcp-api-key precedent.
  }
}
