import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#038-mcp-api-key-management: extends the cross-category audit
 * enums introduced in `1779195577000-CreatePlatformAuditEntry` with the MCP
 * API key lifecycle vocabulary (FR-021/FR-022):
 *
 * - `platform_audit_category` gains `mcp_api_key` — one row per mint or
 *   revoke of an MCP API key (self-service or admin).
 * - `platform_audit_outcome` gains `key_minted` / `key_revoked`.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is the non-breaking, additive
 * pattern (same shape as `1784818900000-AddPlatformOperationsAuditCategory`);
 * no table DDL, existing rows unaffected. Migration ordering: this must run
 * BEFORE any MCP API key mint/revoke audit row is written — the standard
 * `migration:run`-then-start sequence guarantees that.
 */
export class AddMcpApiKeyAuditCategory1786500000000
  implements MigrationInterface
{
  name = 'AddMcpApiKeyAuditCategory1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'mcp_api_key'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'key_minted'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'key_revoked'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE`. Removing these values
    // safely would require recreating the enum types (rewriting every
    // `platform_audit_entry` row referencing them). No-op — enum extensions
    // are treated as forward-only, matching the platform-operations
    // precedent.
  }
}
