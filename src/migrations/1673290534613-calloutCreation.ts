import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  removePreferences,
  removePreferencesForLoop,
} from './utils/preferences';
import {
  addPreferenceDefinitionsWithDefault,
  DefinitionInsertTypeWithDefault,
} from './utils/preferences/add-preference-definitions-defaults';
import {
  addPreferencesToChallenges,
  addPreferencesToHxbs,
  PreferenceInsertType,
} from './utils/preferences/add-preferences';

const ALLOW_MEMBERS_TO_CREATE_CALLOUTS = 'AllowMembersToCreateCallouts';

const ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS =
  'AllowContributorsToCreateCallouts';

export class calloutCreation1673290534613 implements MigrationInterface {
  name = 'calloutCreation1673290534613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const challengeDefinitions: DefinitionInsertTypeWithDefault[] = [
      {
        definitionSet: 'challenge',
        group: 'Privileges',
        displayName: 'Allow contributors to create Callouts.',
        description: 'Allow contributors to create Callouts.',
        valueType: 'boolean',
        type: ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
        defaultValue: 'false',
      },
    ];
    const prefResults = await addPreferenceDefinitionsWithDefault(
      queryRunner,
      challengeDefinitions
    );
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = prefResults.map(x => {
      return {
        definitionId: x.uuid,
        value: x.defaultValue,
      };
    });
    await addPreferencesToChallenges(queryRunner, preferences);

    const hxbDefinitions: DefinitionInsertTypeWithDefault[] = [
      {
        definitionSet: 'hxb',
        group: 'Privileges',
        displayName: 'Allow members to create Callouts.',
        description: 'Allow members to create Callouts.',
        valueType: 'boolean',
        type: ALLOW_MEMBERS_TO_CREATE_CALLOUTS,
        defaultValue: 'false',
      },
    ];
    const prefHxbResults = await addPreferenceDefinitionsWithDefault(
      queryRunner,
      hxbDefinitions
    );
    // new preferences on existing users
    const hxbPreferences: PreferenceInsertType[] = prefHxbResults.map(x => {
      return {
        definitionId: x.uuid,
        value: x.defaultValue,
      };
    });
    await addPreferencesToHxbs(queryRunner, hxbPreferences);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferencesForLoop(queryRunner, [
      ALLOW_MEMBERS_TO_CREATE_CALLOUTS,
    ]);
    await removePreferencesForLoop(queryRunner, [
      ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
    ]);
  }
}
