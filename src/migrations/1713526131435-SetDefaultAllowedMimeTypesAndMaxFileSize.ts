import { MimeFileType } from '@common/enums/mime.file.type';
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_MAX_ALLOWED_FILE_SIZE = 5242880;

const DEFAULT_VISUAL_ALLOWED_MIME_TYPES: MimeFileType[] = [
  MimeFileType.JPG,
  MimeFileType.JPEG,
  MimeFileType.XPNG,
  MimeFileType.PNG,
  MimeFileType.GIF,
  MimeFileType.WEBP,
  MimeFileType.SVG,
  MimeFileType.AVIF,
  MimeFileType.PDF,
];

export class SetDefaultAllowedMimeTypesAndMaxFileSize1713526131435
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const storageBuckets: {
      id: string;
      maxFileSize: number | null;
      allowedMimeTypes: string[] | null;
    }[] = await queryRunner.query(`SELECT * FROM storage_bucket`);

    for (const storageBucket of storageBuckets) {
      if (storageBucket.allowedMimeTypes === null) {
        await queryRunner.query(
          `UPDATE storage_bucket SET allowedMimeTypes = ? WHERE id = ?`,
          [DEFAULT_VISUAL_ALLOWED_MIME_TYPES.join(','), storageBucket.id]
        );
      }
      if (storageBucket.maxFileSize === null) {
        await queryRunner.query(
          `UPDATE storage_bucket SET maxFileSize = ? WHERE id = ?`,
          [DEFAULT_MAX_ALLOWED_FILE_SIZE, storageBucket.id]
        );
      }
    }

    await queryRunner.query(
      `ALTER TABLE storage_bucket ALTER COLUMN maxFileSize SET DEFAULT ${DEFAULT_MAX_ALLOWED_FILE_SIZE};`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
