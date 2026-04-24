import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename the `document` table (and its storageBucketId index) to `file` to
 * align with the Go file-service-go contract.
 *
 * Idempotency: both statements use `IF EXISTS` so a partial apply or a rerun
 * after manual intervention becomes a safe no-op rather than hard-failing.
 *
 * Rollback: `down()` performs the symmetric renames, also guarded by
 * `IF EXISTS`. No data is copied or transformed, so rollback is instantaneous
 * and lossless — FK constraints reference the renamed table automatically
 * because Postgres stores them by object OID, not name.
 */
export class RenameDocumentTableToFile1776778800000
  implements MigrationInterface
{
  name = 'RenameDocumentTableToFile1776778800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FK constraints use hashed names and follow the table by OID, so they
    // continue to reference the renamed table automatically.
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "document" RENAME TO "file"`
    );

    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_document_storageBucketId" RENAME TO "IDX_file_storageBucketId"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_file_storageBucketId" RENAME TO "IDX_document_storageBucketId"`
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "file" RENAME TO "document"`
    );
  }
}
