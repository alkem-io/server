import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class hxbpreferences1646683828244 implements MigrationInterface {
  name = 'hxbpreferences1646683828244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` ADD \`definitionSet\` char(32) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`hxbId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_77741fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`hxbId\`) REFERENCES \`hxb\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `update preference_definition set definitionSet = 'user'`
    );

    // populate some initial definitions
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hxb', 'MembershipHxb', 'Applications allowed', 'Allow applications to this Hxb', 'boolean', 'MembershipApplicationsFromAnyone')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hxb', 'MembershipHxb', 'Anyone can join', 'Allow any registered user to join this Hxb', 'boolean', 'MembershipJoinHxbFromAnyone')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hxb', 'MembershipHxb', 'Host Organization Join', 'Allow members of the host organization to join', 'boolean', 'MembershipJoinHxbFromHostOrganizationMembers')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hxb', 'Authorization', 'Anonymous read access', 'Allow non-members to read the contents of this Hxb', 'boolean', 'AuthorizationAnonymousReadAccess')`
    );

    // popuplate preferences on existing hxbs
    const hxbDefinitions: any[] = await queryRunner.query(
      `SELECT * FROM preference_definition WHERE preference_definition.definitionSet = 'hxb'`
    );
    console.log(`Found ${hxbDefinitions.length} hxb definitions`);
    const hxbs: any[] = await queryRunner.query(
      `SELECT hxb.id, hxb.authorizationId FROM hxb`
    );
    console.log(`Found ${hxbs.length} hxbs`);
    for (const hxb of hxbs) {
      for (const def of hxbDefinitions) {
        const uuid = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES ('${uuid}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        let initialValue = false;
        // Applications are allowed by default
        if (def.type === 'MembershipApplicationsAllowed') initialValue = true;
        // Migrate the anonymousRead access setting
        if (def.type === 'AuthorizationAnonymousReadAccess') {
          const hxbAuthorizations: any[] = await queryRunner.query(
            `SELECT * FROM authorization_policy WHERE authorization_policy.id = '${hxb.authorizationId}'`
          );
          const hxbAuthorization = hxbAuthorizations[0];
          if (hxbAuthorization.anonymousReadAccess === 1) initialValue = true;
        }
        await queryRunner.query(
          `INSERT INTO preference (id, createdDate, updatedDate, version, value, authorizationId, preferenceDefinitionId, userId, hxbId) VALUES (UUID(), NOW(), NOW(), 1, '${initialValue}', '${uuid}', '${def.id}', NULL,'${hxb.id}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_77741fbd1fef95a0540f7e7d1e2\``
    );
    const hxbDefinitions: any[] = await queryRunner.query(
      `SELECT * FROM preference_definition WHERE preference_definition.definitionSet = 'hxb'`
    );
    for (const hxbDef of hxbDefinitions) {
      const hxbPrefereces: any[] = await queryRunner.query(
        `SELECT * FROM preference WHERE preference.preferenceDefinitionId = '${hxbDef.id}'`
      );
      for (const hxbPref of hxbPrefereces) {
        await queryRunner.query(
          `DELETE FROM preference WHERE preference.id = '${hxbPref.id}'`
        );
      }
      await queryRunner.query(
        `DELETE FROM preference_definition WHERE preference_definition.id = '${hxbDef.id}'`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` DROP COLUMN \`definitionSet\``
    );
    await queryRunner.query(`ALTER TABLE \`preference\` DROP COLUMN \`hxbId\``);
  }
}
