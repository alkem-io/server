import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from '@src/migrations/utils/preferences';
import { UserPreferenceType } from '@src/common/enums';
import { PreferenceType } from '@common/enums/preference.type';

export class calloutNotificationPreferences1661850289882
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'Notification',
        displayName: 'New Callout published',
        description:
          'Receive a notification when a Callout is published in a community I am a member of',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_CALLOUT_PUBLISHED,
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
      PreferenceType.NOTIFICATION_CALLOUT_PUBLISHED,
    ]);
  }
}
