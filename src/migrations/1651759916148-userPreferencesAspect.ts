import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from './utils/preferences';
import { UserPreferenceType } from '@src/common';
import { PreferenceType } from '@common/enums/preference.type';

export class userPreferencesAspect1651759916148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'NotificationCommunityAdmin',
        displayName: '[Admin] New aspect created',
        description: 'Receive notification when an aspect is created',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ASPECT_CREATED_ADMIN,
      },
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New aspect created',
        description: 'Receive notification when I create an aspect',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ASPECT_CREATED,
      },
      {
        definitionSet: 'user',
        group: 'NotificationCommunityAdmin',
        displayName: '[Admin] New comment on aspect created',
        description:
          'Receive notification when a comment is created on an aspect',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ASPECT_COMMENT_CREATED_ADMIN,
      },
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New comment on aspect created',
        description:
          'Receive notification when a comment is created on my aspect',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ASPECT_COMMENT_CREATED,
      },
    ];
    const defIds = await addPreferenceDefinitions(queryRunner, definitions);
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = defIds.map(x => ({
      definitionId: x,
      value: 'true',
    }));
    await addPreferencesToUsers(queryRunner, preferences);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [
      PreferenceType.NOTIFICATION_ASPECT_CREATED_ADMIN,
      PreferenceType.NOTIFICATION_ASPECT_CREATED,
      PreferenceType.NOTIFICATION_ASPECT_COMMENT_CREATED_ADMIN,
      PreferenceType.NOTIFICATION_ASPECT_COMMENT_CREATED,
    ]);
  }
}
