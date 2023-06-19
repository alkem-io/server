import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addPreferenceDefinitions,
  addPreferencesToHxbs,
  DefinitionInsertType,
  PreferenceInsertType,
  removePreferences,
} from '@src/migrations/utils/preferences';

// Do NOT make links back to the main code base
const ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'AllowMembersToCreateChallenges';

export class hxbPref1664603132147 implements MigrationInterface {
  name = 'hxbPref1664603132147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertType[] = [
      {
        definitionSet: 'hxb',
        group: 'Privileges',
        displayName: 'Allow Hxb members to create Challenges',
        description: 'Allow members of the Hxb to create Challenges.',
        valueType: 'boolean',
        type: ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      },
    ];
    const defIds = await addPreferenceDefinitions(queryRunner, definitions);
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = defIds.map(x => ({
      definitionId: x,
      value: 'false',
    }));
    await addPreferencesToHxbs(queryRunner, preferences);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [ALLOW_MEMBERS_TO_CREATE_CHALLENGES]);
  }
}
