import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToUsers,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from '@src/migrations/utils/preferences';
import { UserPreferenceType } from '@common/enums';
import { PreferenceType } from '@common/enums/preference.type';

export class messagingPreferences1673877375697 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'user',
        group: 'NotificationCommunication',
        displayName: 'Mentions or tags of you in posts or comments',
        description:
          'Receive a notification when a user tags you in a post or a comment',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNICATION_MENTION,
      },
      {
        definitionSet: 'user',
        group: 'NotificationCommunication',
        displayName: 'Allow direct messages from other users',
        description:
          'Receive a notification when a user wants to directly send you a message or shares with you',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE,
      },
      {
        definitionSet: 'user',
        group: 'NotificationOrganizationAdmin',
        displayName: 'Mentions or tags of an organization you manage',
        description:
          'Receive a notification when the organization you are admin of is mentioned',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ORGANIZATION_MENTION,
      },
      {
        definitionSet: 'user',
        group: 'NotificationOrganizationAdmin',
        displayName: 'Allow direct messages to organizations you manage',
        description:
          'Receive notification when the organization you are admin of is messaged',
        valueType: 'boolean',
        type: UserPreferenceType.NOTIFICATION_ORGANIZATION_MESSAGE,
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
      PreferenceType.NOTIFICATION_COMMUNICATION_MENTION,
      PreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE,
      PreferenceType.NOTIFICATION_ORGANIZATION_MENTION,
      PreferenceType.NOTIFICATION_ORGANIZATION_MESSAGE,
    ]);
  }
}
