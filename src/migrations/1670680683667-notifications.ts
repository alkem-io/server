import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from './utils/preferences';

enum UserPreferenceType {
  NOTIFICATION_CANVAS_CREATED = 'NotificationCanvasCreated',
  NOTIFICATION_DISCUSSION_COMMENT_CREATED = 'NotificationDiscussionCommentCreated',
  NOTIFICATION_USER_REMOVED = 'NotificationUserRemoved',
}

export class notifications1670680683667 implements MigrationInterface {
  name = 'notifications1670680683667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitionsTrue: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New Canvas created',
        description:
          'Receive a notification when a Canvas is created in a community I am a member of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_CANVAS_CREATED,
      },
      {
        definitionSet: 'user',
        group: 'NotificationGlobalAdmin',
        displayName: '[Admin] User profile deleted',
        description: 'Receive a notification when a user profile is removed',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_USER_REMOVED,
      },
    ];
    const defIdsTrue = await addPreferenceDefinitions(
      queryRunner,
      definitionsTrue
    );
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = defIdsTrue.map(x => ({
      definitionId: x,
      value: 'true',
    }));
    await addPreferencesToUsers(queryRunner, preferences);

    const definitionsFalse: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New comment on Discssion',
        description:
          'Receive a notification when a new comment is added to a Discussion in a community I am a member of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_DISCUSSION_COMMENT_CREATED,
      },
    ];
    const defIdsFalse = await addPreferenceDefinitions(
      queryRunner,
      definitionsFalse
    );
    // new preferences on existing users
    const preferencesFalse: PreferenceInsertType[] = defIdsFalse.map(x => ({
      definitionId: x,
      value: 'false',
    }));
    await addPreferencesToUsers(queryRunner, preferencesFalse);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [
      UserPreferenceType.NOTIFICATION_CANVAS_CREATED,
      UserPreferenceType.NOTIFICATION_DISCUSSION_COMMENT_CREATED,
      UserPreferenceType.NOTIFICATION_USER_REMOVED,
    ]);
  }
}
