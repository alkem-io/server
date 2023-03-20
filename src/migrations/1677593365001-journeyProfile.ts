import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';
import { formatDatetime } from './utils/format-datetime';

export class journeyProfile1677593365001 implements MigrationInterface {
  name = 'journeyProfile1677593365001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend Hub / Challenge / Opportunity with profiles
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_71231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_81231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_91231450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // remove existing FKs that will no longer apply
    // Hub ==> Tagset
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_3a69b0a6c67ead7617634009903\``
    );
    // Challenge ==> tagset
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_6b1bcaf365212806d8cc1f87b54\``
    );
    // Opportunity ==> tagset
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_7d23d17ce61f11c92ff1ea0ed1a\``
    );
    // Reference ==> Context
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_07dbf4b02a078a59c216691f5eb\``
    );
    // Context ==> Location
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_88888ca8ac212b8357637794d6f\``
    );
    // Visual ==> Context
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_63de1450cf75dc486700ca034c6\``
    );

    // Location uniqueness; need to drop this so can move the location
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_77777ca8ac212b8357637794d6f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP INDEX \`IDX_77777ca8ac212b8357637794d6\``
    );

    /////////////////////////////////
    // Migrate the Hubs
    const hubs: any[] = await queryRunner.query(
      `SELECT id, tagsetId, contextId, displayName from hub`
    );
    for (const hub of hubs) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id, version, tagline, locationId, background from context WHERE (id = '${hub.contextId}')`
      );
      const context = contexts[0];
      const newProfileID = randomUUID();
      const profileAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
          ('${profileAuthID}',
          1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO profile (id, version, authorizationId, locationId, description, displayName, tagline)
              VALUES ('${newProfileID}',
                      '${context.version}',
                      '${profileAuthID}',
                      '${context.locationId}',
                      '${escapeString(context.background)}',
                      '${escapeString(hub.displayName)}',
                      '${escapeString(context.tagline)}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${newProfileID}' WHERE (id = '${hub.tagsetId}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      await queryRunner.query(
        `UPDATE hub SET profileId = '${newProfileID}' WHERE (id = '${hub.id}')`
      );
    }

    /////////////////////////////////
    // Migrate the Challenges
    const challenges: any[] = await queryRunner.query(
      `SELECT id, tagsetId, contextId, displayName from challenge`
    );
    for (const challenge of challenges) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id, version, tagline, locationId, background from context WHERE (id = '${challenge.contextId}')`
      );
      const context = contexts[0];
      const newProfileID = randomUUID();
      const profileAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
          ('${profileAuthID}',
           1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO profile (id, version, authorizationId, locationId, description, displayName, tagline)
              VALUES ('${newProfileID}',
                      '${context.version}',
                      '${profileAuthID}',
                      '${context.locationId}',
                      '${escapeString(context.background)}',
                      '${escapeString(challenge.displayName)}',
                      '${escapeString(context.tagline)}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${newProfileID}' WHERE (id = '${challenge.tagsetId}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      await queryRunner.query(
        `UPDATE challenge SET profileId = '${newProfileID}' WHERE (id = '${challenge.id}')`
      );
    }

    /////////////////////////////////
    // Migrate the Opportunities
    const opportunities: any[] = await queryRunner.query(
      `SELECT id, tagsetId, contextId, displayName from opportunity`
    );
    for (const opportunity of opportunities) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id, version, tagline, locationId, background from context WHERE (id = '${opportunity.contextId}')`
      );
      const context = contexts[0];
      const newProfileID = randomUUID();
      const profileAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${profileAuthID}',
                1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO profile (id, version, authorizationId, locationId, description, displayName, tagline)
                    VALUES ('${newProfileID}',
                            '${context.version}',
                            '${profileAuthID}',
                            '${context.locationId}',
                            '${escapeString(context.background)}',
                            '${escapeString(opportunity.displayName)}',
                            '${escapeString(context.tagline)}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${newProfileID}' WHERE (id = '${opportunity.tagsetId}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      // Update the visuals to be parented on the new profile
      await queryRunner.query(
        `UPDATE visual SET profileId = '${newProfileID}' WHERE (contextId = '${context.id}')`
      );

      await queryRunner.query(
        `UPDATE opportunity SET profileId = '${newProfileID}' WHERE (id = '${opportunity.id}')`
      );
    }

    /////////////////////////////////
    // Remove old data / structure
    await queryRunner.query('ALTER TABLE `hub` DROP COLUMN `tagsetId`');
    await queryRunner.query('ALTER TABLE `challenge` DROP COLUMN `tagsetId`');
    await queryRunner.query('ALTER TABLE `opportunity` DROP COLUMN `tagsetId`');

    await queryRunner.query('ALTER TABLE `hub` DROP COLUMN `displayName`');
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `displayName`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `displayName`'
    );

    await queryRunner.query('ALTER TABLE `context` DROP COLUMN `locationId`');
    await queryRunner.query('ALTER TABLE `context` DROP COLUMN `tagline`');
    await queryRunner.query('ALTER TABLE `context` DROP COLUMN `background`');

    await queryRunner.query('ALTER TABLE `visual` DROP COLUMN `contextId`');
    await queryRunner.query('ALTER TABLE `reference` DROP COLUMN `contextId`');

    // Add back in index for location uniqueness
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` (\`locationId\`)`
    );
  }

  ///////////////////////////////
  public async down(queryRunner: QueryRunner): Promise<void> {
    /////////////////////////////////
    //Hub ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_71231450cf75dc486700ca034c6\``
    );
    // challenge ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_81231450cf75dc486700ca034c6\``
    );
    // Opportunity ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_91231450cf75dc486700ca034c6\``
    );

    // Add in new data / structure
    await queryRunner.query('ALTER TABLE `hub` ADD `tagsetId` char(36) NULL');
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_3a69b0a6c67ead7617634009903\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `tagsetId` char(36) NULL'
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_6b1bcaf365212806d8cc1f87b54\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `tagsetId` char(36) NULL'
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_7d23d17ce61f11c92ff1ea0ed1a\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`hub\`ADD \`displayName\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\`ADD \`displayName\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\`ADD \`displayName\` varchar(255) NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `context` ADD `locationId` char(36) NULL'
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_88888ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD `tagline` varchar(255) NULL'
    );
    await queryRunner.query('ALTER TABLE `context` ADD `background` text NULL');

    await queryRunner.query(
      'ALTER TABLE `visual` ADD `contextId` char(36) NULL'
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_63de1450cf75dc486700ca034c6\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `reference` ADD `contextId` char(36) NULL'
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_07dbf4b02a078a59c216691f5eb\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    /////////////////////////////////
    // Migrate the Hubs
    const hubs: any[] = await queryRunner.query(
      `SELECT id, profileId, contextId from hub`
    );
    for (const hub of hubs) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id from context WHERE (id = '${hub.contextId}')`
      );
      const context = contexts[0];
      const profiles: any[] = await queryRunner.query(
        `SELECT id, tagline, description, displayName, locationId, authorizationId from profile WHERE (id = '${hub.profileId}')`
      );
      const profile = profiles[0];
      const tagsets: any[] = await queryRunner.query(
        `SELECT id, profileId from tagset WHERE (profileId = '${profile.id}')`
      );
      const tagset = tagsets[0];

      //Remove old authorization policy
      await queryRunner.query(
        `DELETE FROM authorization_policy WHERE (id = '${profile.authorizationId}')`
      );

      // Update tagset, displayName on Hub
      await queryRunner.query(
        `UPDATE hub SET
        tagsetId = '${tagset.id}',
        displayName = '${escapeString(profile.displayName)}'
        WHERE (id = '${hub.id}')`
      );

      // Update tagline, locationId on Hub
      await queryRunner.query(
        `UPDATE context SET
        locationId = '${profile.locationId}',
        tagline = '${escapeString(profile.tagline)}',
        background = '${escapeString(profile.description)}'
        WHERE (id = '${context.id}')`
      );

      // Update the tagset to be not part of a profile
      await queryRunner.query(
        `UPDATE tagset SET profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the references to be parented on the Contet
      await queryRunner.query(
        `UPDATE reference SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the visuals to be parented on the Context
      await queryRunner.query(
        `UPDATE visual SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      await queryRunner.query(
        `DELETE FROM profile WHERE (id = '${profile.id}')`
      );
    }

    /////////////////////////////////
    // Migrate the Challenges
    const challenges: any[] = await queryRunner.query(
      `SELECT id, profileId, contextId from challenge`
    );
    for (const challenge of challenges) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id from context WHERE (id = '${challenge.contextId}')`
      );
      const context = contexts[0];
      const profiles: any[] = await queryRunner.query(
        `SELECT id, tagline, description, displayName, locationId, authorizationId from profile WHERE (id = '${challenge.profileId}')`
      );
      const profile = profiles[0];
      const tagsets: any[] = await queryRunner.query(
        `SELECT id, profileId from tagset WHERE (profileId = '${profile.id}')`
      );
      const tagset = tagsets[0];

      // Remove old auth
      await queryRunner.query(
        `DELETE FROM authorization_policy WHERE (id = '${profile.authorizationId}')`
      );

      // Update tagset, displayName on Hub
      await queryRunner.query(
        `UPDATE challenge SET
        tagsetId = '${tagset.id}',
        displayName = '${escapeString(profile.displayName)}'
        WHERE (id = '${challenge.id}')`
      );

      // Update , tagline, locationId on Hub
      await queryRunner.query(
        `UPDATE context SET
        locationId = '${profile.locationId}',
        tagline = '${escapeString(profile.tagline)}',
        background = '${escapeString(profile.description)}'
        WHERE (id = '${context.id}')`
      );

      // Update the tagset to be not part of a profile
      await queryRunner.query(
        `UPDATE tagset SET profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the references to be parented on the Contet
      await queryRunner.query(
        `UPDATE reference SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the visuals to be parented on the Context
      await queryRunner.query(
        `UPDATE visual SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      await queryRunner.query(
        `DELETE FROM profile WHERE (id = '${profile.id}')`
      );
    }

    /////////////////////////////////
    // Migrate the Opportunities
    const opportunities: any[] = await queryRunner.query(
      `SELECT id, profileId, contextId from opportunity`
    );
    for (const opportunity of opportunities) {
      const contexts: any[] = await queryRunner.query(
        `SELECT id from context WHERE (id = '${opportunity.contextId}')`
      );
      const context = contexts[0];
      const profiles: any[] = await queryRunner.query(
        `SELECT id, tagline, description, displayName, locationId, authorizationId from profile WHERE (id = '${opportunity.profileId}')`
      );
      const profile = profiles[0];
      const tagsets: any[] = await queryRunner.query(
        `SELECT id, profileId from tagset WHERE (profileId = '${profile.id}')`
      );
      const tagset = tagsets[0];

      //Remove old authorization policy
      await queryRunner.query(
        `DELETE FROM authorization_policy WHERE (id = '${profile.authorizationId}')`
      );

      // Update tagset, displayName on Hub
      await queryRunner.query(
        `UPDATE opportunity SET
        tagsetId = '${tagset.id}',
        displayName = '${escapeString(profile.displayName)}'
        WHERE (id = '${opportunity.id}')`
      );

      // Update tagline, locationId on Hub
      await queryRunner.query(
        `UPDATE context SET
        locationId = '${profile.locationId}',
        tagline = '${escapeString(profile.tagline)}',
        background = '${escapeString(profile.description)}'
        WHERE (id = '${context.id}')`
      );

      // Update the tagset to be not part of a profile
      await queryRunner.query(
        `UPDATE tagset SET profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the references to be parented on the Contet
      await queryRunner.query(
        `UPDATE reference SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      // Update the visuals to be parented on the Context
      await queryRunner.query(
        `UPDATE visual SET contextId = '${context.id}', profileId = NULL WHERE (profileId = '${profile.id}')`
      );

      await queryRunner.query(
        `DELETE FROM profile WHERE (id = '${profile.id}')`
      );
    }

    // Remove old data / structure
    await queryRunner.query('ALTER TABLE `hub` DROP COLUMN `profileId`');
    await queryRunner.query('ALTER TABLE `challenge` DROP COLUMN `profileId`');
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `profileId`'
    );
  }
}
