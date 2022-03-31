import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class preferenceSet1648454924859 implements MigrationInterface {
  name = 'preferenceSet1648454924859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the definition of preferenceSet + add to User, Hub
    await queryRunner.query(
      `CREATE TABLE \`preference_set\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
           \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`version\` int NOT NULL,
             \`authorizationId\` varchar(36) NULL,
              UNIQUE INDEX \`REL_8888dccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference_set\` ADD CONSTRAINT \`FK_88885901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_88880355b4e9bd6b02c66507aa\` (\`preferenceSetId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_99990355b4e9bd6b02c66507aa\` (\`preferenceSetId\`)`
    );

    // add column to preference to point to a preferenceSetId
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD \`preferenceSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` ADD CONSTRAINT \`FK_88881fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    const hubs: { id: string }[] = await queryRunner.query(
      'SELECT id from hub'
    );
    // for each hub:
    for (const hub of hubs) {
      // create authorization ID for new preference set
      const authID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      // create preferenceSet
      const prefSetId = randomUUID();
      await queryRunner.query(
        `INSERT INTO preference_set VALUES ('${prefSetId}', NOW(), NOW(), 1, '${authID}')`
      );
      // set preferenceSetId on Hub
      await queryRunner.query(
        `UPDATE hub SET preferenceSetId='${prefSetId}' WHERE id='${hub.id}'`
      );
      // Find all preferences that pointed to this hub
      // Update all preferences for the Hub above updated to point to the newly created preference set
      await queryRunner.query(
        `UPDATE preference SET preferenceSetId='${prefSetId}' where hubId='${hub.id}'`
      );
    }
    // remove the hubId column on preference
    await queryRunner.query(
      `ALTER TABLE preference DROP FOREIGN KEY FK_77741fbd1fef95a0540f7e7d1e2, DROP COLUMN hubId`
    );
    // repeat for users
    const users: { id: string }[] = await queryRunner.query(
      `SELECT id FROM user`
    );
    for (const user of users) {
      const authID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      // create preferenceSet
      const prefSetId = randomUUID();
      await queryRunner.query(
        `INSERT INTO preference_set VALUES ('${prefSetId}', NOW(), NOW(), 1, '${authID}')`
      );
      // set preferenceSetId on user
      await queryRunner.query(
        `UPDATE user SET preferenceSetId='${prefSetId}' WHERE id='${user.id}'`
      );
      // Find all preferences that pointed to this user
      // Update all preferences for the user above updated to point to the newly created preference set
      await queryRunner.query(
        `UPDATE preference SET preferenceSetId='${prefSetId}' where userId='${user.id}'`
      );
    }
    // remove the userId column on preference
    await queryRunner.query(`
            ALTER TABLE preference DROP FOREIGN KEY FK_5b141fbd1fef95a0540f7e7d1e2, DROP COLUMN userId
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`preference\`
            ADD \`userId\` char(36) NULL,
            ADD CONSTRAINT \`FK_5b141fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
            ADD \`hubId\` char(36) NULL,
            ADD CONSTRAINT \`FK_77741fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`hubId\`) REFERENCES \`hub\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(
      `ALTER TABLE preference DROP FOREIGN KEY FK_88881fbd1fef95a0540f7e7d1e2, DROP COLUMN preferenceSetId`
    );

    await queryRunner.query(
      'ALTER TABLE user DROP INDEX IDX_88880355b4e9bd6b02c66507aa, DROP COLUMN preferenceSetId'
    );
    await queryRunner.query(
      'ALTER TABLE hub DROP INDEX IDX_99990355b4e9bd6b02c66507aa, DROP COLUMN preferenceSetId'
    );

    await queryRunner.query('DROP TABLE preference_set');

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

    // populate preferences on existing hubs
    const hubDefinitions: any[] = await queryRunner.query(
      `SELECT * FROM preference_definition WHERE preference_definition.definitionSet = 'hub'`
    );
    const hubs: any[] = await queryRunner.query(
      `SELECT hub.id, hub.authorizationId FROM hub`
    );
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
}
