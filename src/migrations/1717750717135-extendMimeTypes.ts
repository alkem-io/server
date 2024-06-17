import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'image/bmp',
  'image/jpg',
  'image/jpeg',
  'image/x-png',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

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
