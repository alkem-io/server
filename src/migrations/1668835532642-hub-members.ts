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
const ALLOW_HXB_MEMBERS_TO_CONTRIBUTE = 'AllowHxbMembersToContribute';
const ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES =
  'AllowContributorsToCreateOpportunities';
const ALLOW_NON_MEMBERS_READ_ACCESS = 'AllowNonMembersReadAccess';

export class hxbMembers1668835532642 implements MigrationInterface {
  name = 'hxbMembers1668835532642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions: DefinitionInsertTypeWithDefault[] = [
      {
        definitionSet: 'challenge',
        group: 'Privileges',
        displayName: 'Allow Hxb members to contribute.',
        description: 'Allow Hxb members to contribute.',
        valueType: 'boolean',
        type: ALLOW_HXB_MEMBERS_TO_CONTRIBUTE,
        defaultValue: 'false',
      },
      {
        definitionSet: 'challenge',
        group: 'Privileges',
        displayName: 'Allow contributors to create Opportunities.',
        description:
          'Allow contributors to the Challenge to create Opportunities.',
        valueType: 'boolean',
        type: ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
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
    await removePreferences(queryRunner, [ALLOW_HXB_MEMBERS_TO_CONTRIBUTE]);
    await removePreferences(queryRunner, [
      ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
    ]);
    await removePreferences(queryRunner, [ALLOW_NON_MEMBERS_READ_ACCESS]);
  }
}
