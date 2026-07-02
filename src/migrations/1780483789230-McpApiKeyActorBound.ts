import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Generalizes the MCP api-key auth seam off the hardcoded User UUID
 * (004-web-ai-assistant T027). Adds a nullable `actorId` column and relaxes
 * `userId` to nullable, so a key binds to EXACTLY ONE of a User
 * (`buildForUser`) or an Actor (`buildForActor` — the `virtual-assistant` actor
 * for the system-invoked Flow B path, FR-019).
 *
 * The actual actor-bound key VALUE is a secret minted/provisioned by ops (it is
 * never seeded here) — this migration is schema-only. Existing user-bound rows
 * are untouched (their `userId` stays set; `actorId` is null).
 */
export class McpApiKeyActorBound1780483789230 implements MigrationInterface {
  name = 'McpApiKeyActorBound1780483789230';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Relax userId to nullable (a key may now be actor-bound instead).
    await queryRunner.query(
      `ALTER TABLE "mcp_api_key" ALTER COLUMN "userId" DROP NOT NULL`
    );

    // Add the actor-bound column + index.
    await queryRunner.query(
      `ALTER TABLE "mcp_api_key" ADD COLUMN "actorId" uuid`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_api_key_actorId" ON "mcp_api_key" ("actorId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_api_key_actorId"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_api_key" DROP COLUMN IF EXISTS "actorId"`
    );
    // Restore NOT NULL on userId. Any actor-bound (userId IS NULL) rows must be
    // removed first to satisfy the constraint on rollback.
    await queryRunner.query(
      `DELETE FROM "mcp_api_key" WHERE "userId" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_api_key" ALTER COLUMN "userId" SET NOT NULL`
    );
  }
}
