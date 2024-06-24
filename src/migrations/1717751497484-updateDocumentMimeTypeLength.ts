import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateDocumentMimeTypeLength1717751497484
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE document MODIFY COLUMN mimeType VARCHAR(128) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE document MODIFY COLUMN mimeType VARCHAR(36) NULL`
    );
  }
}
