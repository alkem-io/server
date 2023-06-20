import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class hubpreferences1646683828244 implements MigrationInterface {
  name = 'hubpreferences1646683828244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` ADD \`definitionSet\` char(32) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`hubId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_77741fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`hubId\`) REFERENCES \`hub\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `update preference_definition set definitionSet = 'user'`
    );

    // populate some initial definitions
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hub', 'MembershipHub', 'Applications allowed', 'Allow applications to this Hub', 'boolean', 'MembershipApplicationsFromAnyone')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hub', 'MembershipHub', 'Anyone can join', 'Allow any registered user to join this Hub', 'boolean', 'MembershipJoinHubFromAnyone')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hub', 'MembershipHub', 'Host Organization Join', 'Allow members of the host organization to join', 'boolean', 'MembershipJoinHubFromHostOrganizationMembers')`
    );
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'hub', 'Authorization', 'Anonymous read access', 'Allow non-members to read the contents of this Hub', 'boolean', 'AuthorizationAnonymousReadAccess')`
    );

    // popuplate preferences on existing hubs
    const hubDefinitions: any[] = await queryRunner.query(
      `SELECT * FROM preference_definition WHERE preference_definition.definitionSet = 'hub'`
    );
    console.log(`Found ${hubDefinitions.length} hub definitions`);
    const hubs: any[] = await queryRunner.query(
      `SELECT hub.id, hub.authorizationId FROM hub`
    );
    console.log(`Found ${hubs.length} hubs`);
    for (const hub of hubs) {
      for (const def of hubDefinitions) {
        const uuid = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES ('${uuid}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        let initialValue = false;
        // Applications are allowed by default
        if (def.type === 'MembershipApplicationsAllowed') initialValue = true;
        // Migrate the anonymousRead access setting
        if (def.type === 'AuthorizationAnonymousReadAccess') {
          const hubAuthorizations: any[] = await queryRunner.query(
            `SELECT * FROM authorization_policy WHERE authorization_policy.id = '${hub.authorizationId}'`
          );
          const hubAuthorization = hubAuthorizations[0];
          if (hubAuthorization.anonymousReadAccess === 1) initialValue = true;
        }
        await queryRunner.query(
          `INSERT INTO preference (id, createdDate, updatedDate, version, value, authorizationId, preferenceDefinitionId, userId, hubId) VALUES (UUID(), NOW(), NOW(), 1, '${initialValue}', '${uuid}', '${def.id}', NULL,'${hub.id}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_77741fbd1fef95a0540f7e7d1e2\``
    );
    const hubDefinitions: any[] = await queryRunner.query(
      `SELECT * FROM preference_definition WHERE preference_definition.definitionSet = 'hub'`
    );
    for (const hubDef of hubDefinitions) {
      const hubPrefereces: any[] = await queryRunner.query(
        `SELECT * FROM preference WHERE preference.preferenceDefinitionId = '${hubDef.id}'`
      );
      for (const hubPref of hubPrefereces) {
        await queryRunner.query(
          `DELETE FROM preference WHERE preference.id = '${hubPref.id}'`
        );
      }
      await queryRunner.query(
        `DELETE FROM preference_definition WHERE preference_definition.id = '${hubDef.id}'`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`preference_definition\` DROP COLUMN \`definitionSet\``
    );
    await queryRunner.query(`ALTER TABLE \`preference\` DROP COLUMN \`hubId\``);
  }
}
