import { MigrationInterface, QueryRunner } from 'typeorm';

export class prefDefinitionGroupsRename1642159571969
  implements MigrationInterface
{
  name = 'prefDefinitionGroupsRename1642159571969';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            update user_preference_definition set groupName = 'NotificationCommunityAdmin'
            where type in ('NotificationCommunityDiscussionCreatedAdmin', 'NotificationCommunityUpdateSentAdmin', 'NotificationApplicationReceived')
        `);
    await queryRunner.query(`
            update user_preference_definition set groupName = 'NotificationGlobalAdmin'
            where type = 'NotificationUserSignUp'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update user_preference_definition set groupName = 'Notification'`
    );
  }
}
