import { MigrationInterface, QueryRunner } from "typeorm"

export class avifMimeType1683791826196 implements MigrationInterface {

  allowedTypesNew = [
    'image/png',
    'image/x-png',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
    'image/avif',
    'application/pdf',
  ];

  allowedTypesOld = [
    'image/png',
    'image/x-png',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
  ];

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `UPDATE \`storage_bucket\` SET \`allowedMimeTypes\`='${this.allowedTypesNew}'`
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `UPDATE \`storage_bucket\` SET \`allowedMimeTypes\`='${this.allowedTypesOld}'`
      );
    }

}
