import { MigrationInterface, QueryRunner } from 'typeorm';
import { removePreferences } from './utils/preferences';
import {
  addPreferenceDefinitionsWithDefault,
  DefinitionInsertTypeWithDefault,
} from './utils/preferences/add-preference-definitions-defaults';
import {
  addPreferencesToChallenges,
  PreferenceInsertType,
} from './utils/preferences/add-preferences';

// Do NOT make links back to the main code base
const ALLOW_HUB_MEMBERS_TO_CONTRIBUTE = 'AllowHubMembersToContribute';
const ALLOW_MEMBERS_TO_CREATE_OPPORTUNITIES =
  'AllowMembersToCreateOpportunities';
const ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess';

export class hubMembers1668835532642 implements MigrationInterface {
  name = 'hubMembers1668835532642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertTypeWithDefault[] = [
      {
        definitionSet: 'challenge',
        group: 'Privileges',
        displayName: 'Allow Hub members to contribute.',
        description: 'Allow Hub members to contribute.',
        valueType: 'boolean',
        type: ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
        defaultValue: 'false',
      },
      {
        definitionSet: 'challenge',
        group: 'Privileges',
        displayName: 'Allow members to create Opportunities.',
        description: 'Allow members of the Challenge to create Opportunities.',
        valueType: 'boolean',
        type: ALLOW_MEMBERS_TO_CREATE_OPPORTUNITIES,
        defaultValue: 'false',
      },
      {
        definitionSet: 'challenge',
        group: 'Authorization',
        displayName:
          'Allow non-members to read the contents of this Challenge.',
        description:
          'Allow non-members to read the contents of this Challenge.',
        valueType: 'boolean',
        type: ALLOW_NON_MEMBERS_READ_ACCESS,
        defaultValue: 'true',
      },
    ];
    const prefResults = await addPreferenceDefinitionsWithDefault(
      queryRunner,
      definitions
    );
    // new preferences on existing users
    const preferences: PreferenceInsertType[] = prefResults.map(x => {
      return {
        definitionId: x.uuid,
        value: x.defaultValue,
      };
    });
    await addPreferencesToChallenges(queryRunner, preferences);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removePreferences(queryRunner, [ALLOW_HUB_MEMBERS_TO_CONTRIBUTE]);
    await removePreferences(queryRunner, [
      ALLOW_MEMBERS_TO_CREATE_OPPORTUNITIES,
    ]);
    await removePreferences(queryRunner, [ALLOW_NON_MEMBERS_READ_ACCESS]);
  }
}
