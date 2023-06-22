import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from './utils/preferences';
import { UserPreferenceType } from '@src/common/enums/user.preference.type';
import { PreferenceType } from '@common/enums/preference.type';

export class userPreferencesAspect1651759916148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'NotificationCommunityAdmin',
        displayName: '[Admin] New aspect created',
        description:
          'Receive notification when an aspect is created in a community I am administrator of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_POST_CREATED_ADMIN,
      },
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New aspect created',
        description:
          'Receive notification when an aspect is created in community i am a member of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_POST_CREATED,
      },
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New comment on my aspect',
        description:
          'Receive notification when a comment is created on my aspect',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_POST_COMMENT_CREATED,
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
      PreferenceType.NOTIFICATION_POST_CREATED_ADMIN,
      PreferenceType.NOTIFICATION_POST_CREATED,
      PreferenceType.NOTIFICATION_POST_COMMENT_CREATED,
    ]);
  }
}
