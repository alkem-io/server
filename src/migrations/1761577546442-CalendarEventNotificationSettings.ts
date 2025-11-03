import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalendarEventNotificationSettings1761577546442
  implements MigrationInterface
{
  name = 'CalendarEventNotificationSettings1761577546442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add communityCalendarEvents notification setting to all existing users
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = JSON_SET(
        notification,
        '$.space.communityCalendarEvents',
        JSON_OBJECT('email', true, 'inApp', true)
      )
      WHERE JSON_EXTRACT(notification, '$.space.communityCalendarEvents') IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove communityCalendarEvents notification setting from all users
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = JSON_REMOVE(
        notification,
        '$.space.communityCalendarEvents'
      )
      WHERE JSON_EXTRACT(notification, '$.space.communityCalendarEvents') IS NOT NULL
    `);
  }
}
