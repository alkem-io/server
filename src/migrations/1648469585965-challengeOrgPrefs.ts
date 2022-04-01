import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class challengeOrgPrefs1648469585965 implements MigrationInterface {
  name = 'challengeOrgPrefs1648469585965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // expand org table with pref set
    await queryRunner.query(`
            ALTER TABLE organization
            ADD preferenceSetId varchar(36) NULL,
            ADD UNIQUE INDEX IDX_58fd47c4a6ac8df9fe2bcaed87 (preferenceSetId)
        `);
    // pref def for the organization
    const orgPrefDef = randomUUID();
    await queryRunner.query(`
            INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
            VALUES ('${orgPrefDef}', 1, 'organization', 'AuthorizationOrganization', 'Domain based membership', 'Automatically add new users with emails matching the domain of the Organization', 'boolean', 'AuthorizationOrganizationMatchDomain')
        `);
    // preferences for organizations
    const orgs: { id: string }[] = await queryRunner.query(
      `SELECT id from organization`
    );
    for (const org of orgs) {
      // create preferenceSet
      const prefSetAuthId = randomUUID();
      await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${prefSetAuthId}', NOW(), NOW(), 1, '', '', 0, '')
           `);
      const prefSetId = randomUUID();
      await queryRunner.query(
        `INSERT INTO preference_set VALUES ('${prefSetId}', NOW(), NOW(), 1, '${prefSetAuthId}')`
      );
      // create pref
      const prefAuthId = randomUUID();
      await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${prefAuthId}', NOW(), NOW(), 1, '', '', 0, '')
           `);
      await queryRunner.query(`
                INSERT INTO preference (id, createdDate, updatedDate, version, value, authorizationId, preferenceDefinitionId, preferenceSetId)
                VALUES (UUID(), NOW(), NOW(), 1, 'false', '${prefAuthId}', '${orgPrefDef}', '${prefSetId}')
            `);
      // update org with pref set
      await queryRunner.query(
        `UPDATE organization SET preferenceSetId='${prefSetId}' WHERE id='${org.id}'`
      );
    }
    // expand challenge table with pref set
    await queryRunner.query(`
            ALTER TABLE challenge
            ADD preferenceSetId varchar(36) NULL,
            ADD UNIQUE INDEX IDX_88592bee71718eec66a3bfc63f (preferenceSetId)
        `);
    // pref defs for the challenge
    const challengeJoinPrefDef = randomUUID();
    const challengeApplyPrefDef = randomUUID();
    const challengeFeedbackPrefDef = randomUUID();
    await queryRunner.query(`
            INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
            VALUES
            ('${challengeJoinPrefDef}', 1, 'challenge', 'MembershipChallenge', 'Allow Hub members to join', 'Allow members of the parent Hub to join this Challenge', 'boolean', 'MembershipJoinChallengeFromHubMembers'),
            ('${challengeApplyPrefDef}', 1, 'challenge', 'MembershipChallenge', 'Allow Hub members to apply', 'Allow members of the parent Hub to apply to this Challenge', 'boolean', 'MembershipApplyChallengeFromHubMembers'),
            ('${challengeFeedbackPrefDef}', 1, 'challenge', 'MembershipChallenge', 'Allow Hub members to provide feedback on Context', 'Allow members of the parent Hub to give feedback on the Challenge Context', 'boolean', 'MembershipFeedbackOnChallengeContext')
        `);
    // preferences for challenges
    const challenges: { id: string }[] = await queryRunner.query(
      `SELECT id from challenge`
    );
    for (const challenge of challenges) {
      // create preferenceSet
      const prefSetAuthId = randomUUID();
      await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${prefSetAuthId}', NOW(), NOW(), 1, '', '', 0, '')
           `);
      const prefSetId = randomUUID();
      await queryRunner.query(
        `INSERT INTO preference_set VALUES ('${prefSetId}', NOW(), NOW(), 1, '${prefSetAuthId}')`
      );
      // create pref
      const prefJoinAuthId = randomUUID();
      const prefApplyAuthId = randomUUID();
      const prefFeedbackAuthId = randomUUID();
      await queryRunner.query(`
                INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES
                ('${prefJoinAuthId}', NOW(), NOW(), 1, '', '', 0, ''),
                ('${prefApplyAuthId}', NOW(), NOW(), 1, '', '', 0, ''),
                ('${prefFeedbackAuthId}', NOW(), NOW(), 1, '', '', 0, '')
           `);
      await queryRunner.query(`
                INSERT INTO preference (id, createdDate, updatedDate, version, value, authorizationId, preferenceDefinitionId, preferenceSetId)
                VALUES
                (UUID(), NOW(), NOW(), 1, 'false', '${prefJoinAuthId}', '${challengeJoinPrefDef}', '${prefSetId}'),
                (UUID(), NOW(), NOW(), 1, 'true', '${prefApplyAuthId}', '${challengeApplyPrefDef}', '${prefSetId}'),
                (UUID(), NOW(), NOW(), 1, 'false', '${prefFeedbackAuthId}', '${challengeFeedbackPrefDef}', '${prefSetId}')
            `);
      // update challenge with pref set
      await queryRunner.query(
        `UPDATE challenge SET preferenceSetId='${prefSetId}' WHERE id='${challenge.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE organization
            DROP INDEX IDX_58fd47c4a6ac8df9fe2bcaed87,
            DROP COLUMN preferenceSetId
        `);
    await queryRunner.query(`
            ALTER TABLE challenge
            DROP INDEX IDX_88592bee71718eec66a3bfc63f,
            DROP COLUMN preferenceSetId
        `);
    const prefDefs: any[] = await queryRunner.query(
      `SELECT id FROM preference_definition WHERE definitionSet in ('org', 'challenge')`
    );
    const prefDefIds = prefDefs.map(x => `'${x.id}'`).join(',');
    await queryRunner.query(
      `DELETE FROM preference WHERE preferenceDefinitionId in (${prefDefIds})`
    );
    await queryRunner.query(`
            DELETE FROM preference_definition
            WHERE id in (${prefDefIds})
        `);
  }
}
