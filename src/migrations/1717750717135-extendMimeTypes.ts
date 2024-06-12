import { DEFAULT_ALLOWED_MIME_TYPES } from '@common/enums/mime.file.type';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class extendMimeTypes1717750717135 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE storage_bucket SET allowedMimeTypes = ?', [
      DEFAULT_ALLOWED_MIME_TYPES.join(','),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE storage_bucket SET allowedMimeTypes = ?', [
      'image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif,application/pdf',
    ]);
  }
}
