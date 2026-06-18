import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the unified collaboration metadata/index columns (`contentPointer`,
 * `blobStore`) to the `memo` and `whiteboard` tables (FR-001).
 *
 * Existing rows are back-filled to the inline default: `blobStore = 'inline'`
 * and `contentPointer = <row id>`, establishing the invariant
 * `blobStore == 'inline'  ⟺  contentPointer == id  ⟺  blob in content`
 * for every pre-existing document (data-model.md §Validation / rules).
 *
 * Reversible: `down()` drops the four columns. Idempotent-safe per the project
 * migration harness (`.scripts/migrations/run_validate_migration.sh`).
 */
export class AddContentPointerAndBlobStore1781802081405
  implements MigrationInterface
{
  name = 'AddContentPointerAndBlobStore1781802081405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // memo
    await queryRunner.query(
      `ALTER TABLE "memo" ADD "contentPointer" character varying(512)`
    );
    await queryRunner.query(
      `ALTER TABLE "memo" ADD "blobStore" character varying(128)`
    );
    // whiteboard
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "contentPointer" character varying(512)`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "blobStore" character varying(128)`
    );

    // Back-fill existing rows to the inline default (self-pointer).
    await queryRunner.query(
      `UPDATE "memo" SET "contentPointer" = "id"::varchar, "blobStore" = 'inline'`
    );
    await queryRunner.query(
      `UPDATE "whiteboard" SET "contentPointer" = "id"::varchar, "blobStore" = 'inline'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whiteboard" DROP COLUMN "blobStore"`);
    await queryRunner.query(
      `ALTER TABLE "whiteboard" DROP COLUMN "contentPointer"`
    );
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "blobStore"`);
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "contentPointer"`);
  }
}
