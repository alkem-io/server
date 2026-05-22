import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the `space.admin.userEmailChanged` notification preference for every
 * existing `user_settings` row. Defaults to email-on so a Space's admins/leads
 * are informed when a co-admin's login email changes unless they explicitly opt
 * out — consistent with the `platform.admin.userEmailChanged` default.
 */
export class AddSpaceAdminEmailChangeNotificationSetting1779480100000
  implements MigrationInterface
{
  name = 'AddSpaceAdminEmailChangeNotificationSetting1779480100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" = jsonb_set(
        "notification",
        '{space,admin,userEmailChanged}',
        COALESCE(
          "notification" #> '{space,admin,userEmailChanged}',
          '{"email": true, "inApp": false, "push": false}'::jsonb
        ),
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "notification" = "notification" #- '{space,admin,userEmailChanged}';
    `);
  }
}
