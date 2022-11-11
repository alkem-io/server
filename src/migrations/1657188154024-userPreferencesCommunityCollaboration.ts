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

export class userPreferencesCommunityCollaboration1657188154024
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'Opportunity collaboration interest confirmation',
        description:
          'User receives confirmation email when submits interest for collaboration on an opportunity.',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER,
      },
      {
        definitionSet: 'user',
        group: 'NotificationCommunityAdmin',
        displayName: '[Admin] New opportunity collaboration interest',
        description:
          'Receive notification when a user submits collaboration interest for an opportunity community I am administrator of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN,
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
      PreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER,
      PreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN,
    ]);
  }
}
