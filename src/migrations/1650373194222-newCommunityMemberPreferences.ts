import { MigrationInterface, QueryRunner } from 'typeorm';
import { UserPreferenceType } from '@src/common/enums/user.preference.type';
import { PreferenceType } from '@common/enums/preference.type';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from './utils/preferences';

export class newCommunityMemberPreferences1650373194222
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'Community new member',
        description: 'Receiver notification when I join a community',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER,
      },
      {
        definitionSet: 'user',
        group: 'NotificationCommunityAdmin',
        displayName: '[Admin] Community new member',
        description:
          'Receiver notification when a new user joins a community for which I am an administrator',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN,
      },
    ];
    const defIds = await addPreferenceDefinitions(queryRunner, definitions);
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = [
      { value: 'true', definitionId: defIds[0] },
      { value: 'true', definitionId: defIds[1] },
    ];
    await addPreferencesToUsers(queryRunner, preferences);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [
      PreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER,
      PreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN,
    ]);
  }
}
