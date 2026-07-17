import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationSoundSettings1783953322515
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the "sound" group to the notification JSONB column for every
    // pre-existing user_settings row. The new UserSettingsNotificationSound
    // GraphQL fields are non-null, so legacy rows must carry the key or the
    // resolver throws. The `IS NULL` guard makes this idempotent.
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = jsonb_set(
        COALESCE(notification, '{}'::jsonb),
        '{sound}',
        '{"chatMessage": true, "inAppNotification": true}'::jsonb
      )
      WHERE notification -> 'sound' IS NULL
         OR notification -> 'sound' = 'null'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the "sound" group from the notification JSONB column.
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = notification - 'sound'
      WHERE notification -> 'sound' IS NOT NULL
    `);
  }
}
