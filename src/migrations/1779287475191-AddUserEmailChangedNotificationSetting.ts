import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserEmailChangedNotificationSetting1779287475191
  implements MigrationInterface
{
  name = 'AddUserEmailChangedNotificationSetting1779287475191'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill the platform.admin.userEmailChanged notification preference for
    // every existing user_settings row. Defaults to email-on so platform
    // admins are informed of email changes unless they explicitly opt out.
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" = jsonb_set(
        "notification",
        '{platform,admin,userEmailChanged}',
        COALESCE(
          "notification" #> '{platform,admin,userEmailChanged}',
          '{"email": true, "inApp": false, "push": false}'::jsonb
        ),
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" = "notification" #- '{platform,admin,userEmailChanged}';
    `);
  }
}
