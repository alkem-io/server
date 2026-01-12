import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutPublishedDate1767787991109 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set publishedDate to updatedDate for callouts that are published but have no publishedDate
    await queryRunner.query(`UPDATE callout SET "publishedDate" = "updatedDate"
          WHERE "isTemplate" = false AND settings::jsonb @> '{"visibility":"published"}'::jsonb
            AND "publishedDate" IS NULL;
        `);

    await queryRunner.query(`UPDATE callout SET "publishedBy" = "createdBy"
          WHERE "isTemplate" = false AND settings::jsonb @> '{"visibility":"published"}'::jsonb
            AND "publishedBy" IS NULL AND "createdBy" IS NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to revert data changes, it's good to have publishedDate and publishedBy set when a callout is published
  }
}
