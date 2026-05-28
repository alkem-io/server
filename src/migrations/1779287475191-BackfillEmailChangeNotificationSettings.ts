import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the two email-change notification preferences onto every existing
 * `user_settings` row:
 *
 * - `platform.admin.userEmailChanged` — platform admins are informed of any
 *   user's login-email change.
 * - `space.admin.userEmailChanged` — a Space's admins/leads are informed when a
 *   co-admin's login email changes.
 *
 * Both default to email-on (`{"email": true, "inApp": false, "push": false}`)
 * so recipients are informed unless they explicitly opt out. `COALESCE` keeps
 * each `jsonb_set` idempotent — an already-present preference is left untouched.
 */
export class BackfillEmailChangeNotificationSettings1779287475191
  implements MigrationInterface
{
  name = 'BackfillEmailChangeNotificationSettings1779287475191';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      SET "notification" = "notification"
        #- '{platform,admin,userEmailChanged}'
        #- '{space,admin,userEmailChanged}';
    `);
  }
}
