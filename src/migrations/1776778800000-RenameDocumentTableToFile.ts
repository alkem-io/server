import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDocumentTableToFile1776778800000
  implements MigrationInterface
{
  name = 'RenameDocumentTableToFile1776778800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the table. FK constraints use hashed names, so they continue
    // to reference the renamed table automatically.
    await queryRunner.query(`ALTER TABLE "document" RENAME TO "file"`);

    // Rename the index to match the new table name.
    await queryRunner.query(
      `ALTER INDEX "IDX_document_storageBucketId" RENAME TO "IDX_file_storageBucketId"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "IDX_file_storageBucketId" RENAME TO "IDX_document_storageBucketId"`
    );
    await queryRunner.query(`ALTER TABLE "file" RENAME TO "document"`);
  }
}
