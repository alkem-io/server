import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentStorageBucketIdIndex1773811200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_document_storageBucketId" ON "document" ("storageBucketId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_document_storageBucketId"`
    );
  }
}
