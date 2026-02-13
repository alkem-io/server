import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHeicHeifMimeTypes1770909862763 implements MigrationInterface {
  name = 'AddHeicHeifMimeTypes1770909862763'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image/heic and image/heif to all storage buckets that contain image MIME types
    // but don't already have them. Guard against both to prevent duplicates.
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heic,image/heif'
      WHERE "allowedMimeTypes" LIKE '%image/%'
        AND "allowedMimeTypes" NOT LIKE '%image/heic%'
        AND "allowedMimeTypes" NOT LIKE '%image/heif%'`
    );

    // Handle edge case: rows that already have image/heif but not image/heic
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heic'
      WHERE "allowedMimeTypes" LIKE '%image/%'
        AND "allowedMimeTypes" NOT LIKE '%image/heic%'
        AND "allowedMimeTypes" LIKE '%image/heif%'`
    );

    // Handle edge case: rows that already have image/heic but not image/heif
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = "allowedMimeTypes" || ',image/heif'
      WHERE "allowedMimeTypes" LIKE '%image/%'
        AND "allowedMimeTypes" LIKE '%image/heic%'
        AND "allowedMimeTypes" NOT LIKE '%image/heif%'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove image/heic and image/heif from all storage buckets
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = REPLACE(REPLACE("allowedMimeTypes", ',image/heif', ''), ',image/heic', '')
      WHERE "allowedMimeTypes" LIKE '%image/heic%'
        OR "allowedMimeTypes" LIKE '%image/heif%'`
    );
  }
}
