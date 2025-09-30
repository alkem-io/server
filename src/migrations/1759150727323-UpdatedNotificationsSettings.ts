import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatedNotificationsSettings1759150727323
  implements MigrationInterface
{
  name = 'UpdatedNotificationsSettings1759150727323';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`triggeredByID\` \`triggeredByID\` char(36) NULL COMMENT 'The contributor who triggered the event.'`
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`payload\` \`payload\` json NOT NULL COMMENT 'Additional data that is relevant for this Notification.'`
    );

    // Remove deprecated notification settings from all existing users
    // copyOfMessageSent and spaceCommunityApplicationSubmitted are no longer supported
    await queryRunner.query(`
            UPDATE user_settings
            SET notification = JSON_REMOVE(
                notification,
                '$.user.copyOfMessageSent',
                '$.user.membership.spaceCommunityApplicationSubmitted'
            )
            WHERE JSON_EXTRACT(notification, '$.user.copyOfMessageSent') IS NOT NULL
               OR JSON_EXTRACT(notification, '$.user.membership.spaceCommunityApplicationSubmitted') IS NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: We cannot restore the original values for copyOfMessageSent and spaceCommunityApplicationSubmitted
    // as we don't store the previous state. If rolling back is needed, these will remain removed.

    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`payload\` \`payload\` json NOT NULL COMMENT 'Holds the original notification payload as it was received'`
    );
    await queryRunner.query(
      `ALTER TABLE \`in_app_notification\` CHANGE \`triggeredByID\` \`triggeredByID\` char(36) NULL COMMENT 'The contributor who triggered the event, if applicable.'`
    );
  }
}
