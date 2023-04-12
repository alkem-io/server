import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  DefinitionInsertType,
  PreferenceInsertType,
  addPreferenceDefinitions,
  addPreferencesToUsers,
  removePreferences,
} from './utils/preferences';
import { UserPreferenceType } from '@common/enums/user.preference.type';
import { PreferenceType } from '@common/enums/preference.type';

export class discussionNotificationPreferences1681294238907
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'NotificationForum',
        displayName:
          'Receive a notification when a new Discussion is created in the Forum',
        description:
          'Receive a notification when a new Discussion is created in the Forum',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_FORUM_DISCUSSION_CREATED,
      },
    ];
    const defIds = await addPreferenceDefinitions(queryRunner, definitions);
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = defIds.map(x => ({
      definitionId: x,
      value: 'false',
    }));
    await addPreferencesToUsers(queryRunner, preferences);

    await queryRunner.query(
      `UPDATE preference_definition 
            SET groupName = 'NotificationForum',
                displayName = 'Receive a notification when a new comment is added to a Discussion I created in the Forum',
                description = 'Receive a notification when a new comment is added to a Discussion I created in the Forum',
                type = 'NotificationForumDiscussionComment'
            WHERE type = 'NotificationCommunityDiscussionResponse'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [
      PreferenceType.NOTIFICATION_FORUM_DISCUSSION_CREATED,
    ]);

    await queryRunner.query(
      `UPDATE preference_definition 
            SET groupName = 'Notification',
                displayName = 'Community Discussion response',
                description = 'Receive notification when a response is sent to a discussion I contributed to',
                type = 'NotificationCommunityDiscussionResponse'
            WHERE type = 'NotificationForumDiscussionComment'`
    );
  }
}
