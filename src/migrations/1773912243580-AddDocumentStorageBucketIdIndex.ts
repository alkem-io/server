import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentStorageBucketIdIndex1773912243580
  implements MigrationInterface
{
  name = 'AddDocumentStorageBucketIdIndex1773912243580';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_document_storageBucketId" ON "document" ("storageBucketId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_document_storageBucketId"`
    );
  }
}
