import { MigrationInterface, QueryRunner } from 'typeorm';

export class prefDefinitionGroupsRename1642159571969
  implements MigrationInterface
{
  name = 'prefDefinitionGroupsRename1642159571969';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            update user_preference_definition set groupName = 'NotificationCommunityAdmin'
            where type in ('NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN', 'NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN', 'NOTIFICATION_APPLICATION_RECEIVED')
        `);
    await queryRunner.query(`
            update user_preference_definition set groupName = 'NotificationGlobalAdmin'
            where type = 'NOTIFICATION_USER_SIGN_UP'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update user_preference_definition set groupName = 'Notification'`
    );
  }
}
