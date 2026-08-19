import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIcsMimeType1782300000000 implements MigrationInterface {
  name = 'AddIcsMimeType1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add text/calendar (.ics) to all storage buckets that already allow
    // document MIME types (using application/pdf as the canonical marker)
    // but don't already allow text/calendar. Guard against duplicates.
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = "allowedMimeTypes" || ',text/calendar'
      WHERE "allowedMimeTypes" LIKE '%application/pdf%'
        AND "allowedMimeTypes" NOT LIKE '%text/calendar%'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove text/calendar from all storage buckets that allow it.
    await queryRunner.query(
      `UPDATE storage_bucket
      SET "allowedMimeTypes" = REPLACE("allowedMimeTypes", ',text/calendar', '')
      WHERE "allowedMimeTypes" LIKE '%text/calendar%'`
    );
  }
}
