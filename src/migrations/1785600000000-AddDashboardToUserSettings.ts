import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardToUserSettings1785600000000
  implements MigrationInterface
{
  name = 'AddDashboardToUserSettings1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // New JSONB settings group holding the home-dashboard view preference.
    // Default `{ "activityView": true }` reproduces today's behaviour (the
    // activity feed is shown), so existing users keep the Activity view on.
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "dashboard" jsonb NOT NULL DEFAULT '{"activityView": true}'`
    );

    // Backfill any pre-existing rows to the same value so reads are consistent
    // regardless of when the column default was materialised.
    await queryRunner.query(
      `UPDATE "user_settings" SET "dashboard" = '{"activityView": true}' WHERE "dashboard" IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive rollback: dropping the column permanently deletes every user's
    // stored dashboard preferences (activityView). There is no backup — a
    // subsequent up() re-adds the column with the default, not the prior values.
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "dashboard"`
    );
  }
}
