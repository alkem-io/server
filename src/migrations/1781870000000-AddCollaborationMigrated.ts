import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Temporary progressive-rollout marker for the unified collaboration content
 * migration. The schema migrator runs with exclusive access, so every row that
 * exists at cutover is marked not migrated while rows created afterwards inherit
 * the `true` default and continue through the ordinary snapshot-first create path.
 *
 * A non-null pointer is honoured when this migration is applied to an environment
 * that has already run the Release-A back-fill (for example a feature environment):
 * those rows are already migrated and must not be queued a second time.
 */
export class AddCollaborationMigrated1781870000000
  implements MigrationInterface
{
  name = 'AddCollaborationMigrated1781870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memo" ADD "migrated" boolean NOT NULL DEFAULT true`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "migrated" boolean NOT NULL DEFAULT true`
    );
    await queryRunner.query(
      `UPDATE "memo" SET "migrated" = ("contentPointer" IS NOT NULL AND btrim("contentPointer") <> '')`
    );
    await queryRunner.query(
      `UPDATE "whiteboard" SET "migrated" = ("contentPointer" IS NOT NULL AND btrim("contentPointer") <> '')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whiteboard" DROP COLUMN "migrated"`);
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "migrated"`);
  }
}
