import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the dedicated collaboration content-version column (`contentVersion`) to
 * the `memo` and `whiteboard` tables (FR-004).
 *
 * The collaboration-service room OWNS the content `version`
 * (`contracts/persistence-ports.md`): it bumps the value per persisted
 * snapshot, sends it on `collaboration-save`, and adopts the stored value back
 * on `collaboration-fetch` when it rehydrates. The server therefore persists
 * the room's `version` verbatim here and round-trips it — it does NOT substitute
 * its own counter.
 *
 * This column is intentionally DISTINCT from the inherited TypeORM
 * `@VersionColumn` (`version`) on every entity, which is a server-internal
 * optimistic-locking counter and must not be conflated with the contract value.
 *
 * Nullable (no back-fill): a NULL `contentVersion` is read as `0` by the domain
 * services, i.e. "no snapshot persisted via the unified bus yet" — the first
 * `collaboration-save` writes the room-owned value.
 *
 * Reversible: `down()` drops both columns. Idempotent-safe per the project
 * migration harness (`.scripts/migrations/run_validate_migration.sh`).
 */
export class AddContentVersionToMemoAndWhiteboard1781853256763
  implements MigrationInterface
{
  name = 'AddContentVersionToMemoAndWhiteboard1781853256763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "memo" ADD "contentVersion" integer`);
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "contentVersion" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP COLUMN "contentVersion"`
    );
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "contentVersion"`);
  }
}
