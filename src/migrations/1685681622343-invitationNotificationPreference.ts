import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  DefinitionInsertType,
  PreferenceInsertType,
  addPreferenceDefinitions,
  addPreferencesToUsers,
  removePreferences,
} from './utils/preferences';
import { UserPreferenceType } from '@common/enums';
import { PreferenceType } from '@common/enums/preference.type';

export class invitationNotificationPreference1685681622343
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'Invitations to a community',
        description:
          'Receive a notification when someone invites you to join a community',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNITY_INVITATION_USER,
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
      PreferenceType.NOTIFICATION_COMMUNITY_INVITATION_USER,
    ]);
  }
}
