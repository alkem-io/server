import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class cardProfile1677511855735 implements MigrationInterface {
  name = 'cardProfile1677511855735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the FK constraints
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_111838434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_22223901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_87777ca8ac212b8357637794d6f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_44443901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_282838434c7198a323ea6f475fb\``
    );

    // Migrate the profileData from aspects
    const aspects: any[] = await queryRunner.query(
      `SELECT id, displayName, profileId from aspect`
    );
    for (const aspect of aspects) {
      const newProfileID = randomUUID();
      const profiles: any[] = await queryRunner.query(
        `SELECT id, createdDate, updatedDate, version, authorizationId, description, tagsetId, locationId from card_profile WHERE (id = '${aspect.profileId}')`
      );
      const oldCardProfile = profiles[0];
      await queryRunner.query(
        `INSERT INTO profile (id, createdDate, updatedDate, version, authorizationId, locationId, description, displayName)
            VALUES ('${newProfileID}',
                    '${oldCardProfile.createdDate}',
                    '${oldCardProfile.updatedDate}',
                    '${oldCardProfile.version}',
                    '${oldCardProfile.authorizationId}',
                    '${oldCardProfile.locationId}',
                    '${escapeString(oldCardProfile.description)}',
                    '${escapeString(aspect.displayName)}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${newProfileID}' WHERE (id = '${oldCardProfile.tagsetId}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET profileId = '${newProfileID}' WHERE (cardProfileId = '${oldCardProfile.id}')`
      );
    }

    // Migrate the profileData from aspects
    const events: any[] = await queryRunner.query(
      `SELECT id, displayName, profileId from calendar_event`
    );
    for (const event of events) {
      const newProfileID = randomUUID();
      const profiles: any[] = await queryRunner.query(
        `SELECT id, createdDate, updatedDate, version, authorizationId, description, tagsetId, locationId from card_profile WHERE (id = '${event.profileId}')`
      );
      const oldCardProfile = profiles[0];
      await queryRunner.query(
        `INSERT INTO profile (id, createdDate, updatedDate, version, authorizationId, locationId, description, displayName)
            VALUES ('${newProfileID}',
                    '${oldCardProfile.createdDate}',
                    '${oldCardProfile.updatedDate}',
                    '${oldCardProfile.version}',
                    '${oldCardProfile.authorizationId}',
                    '${oldCardProfile.locationId}',
                    '${escapeString(oldCardProfile.description)}',
                    '${escapeString(event.displayName)}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = '${newProfileID}' WHERE (id = '${oldCardProfile.tagsetId}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET profileId = '${newProfileID}' WHERE (cardProfileId = '${oldCardProfile.id}')`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_111838434c7198a323ea6f475fb\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query('DROP TABLE `card_profile`');
    await queryRunner.query(
      'ALTER TABLE `reference` DROP COLUMN `cardProfileId`'
    );
    await queryRunner.query('ALTER TABLE `aspect` DROP COLUMN `displayName`');
    await queryRunner.query(
      'ALTER TABLE `calendar_event` DROP COLUMN `displayName`'
    );
  }

  ///////////////////////////////
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the profile Fks
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_111838434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\`ADD \`displayName\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\`ADD \`displayName\` varchar(255) NULL`
    );

    await queryRunner.query(
      `CREATE TABLE \`card_profile\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL,
               \`authorizationId\` char(36) NULL,
               \`description\` text NULL,
                \`tagsetId\` char(36) NULL,
                \`locationId\` char(36) NULL,
                UNIQUE INDEX \`REL_33888ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_22223901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_44443901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`cardProfileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_282838434c7198a323ea6f475fb\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD UNIQUE INDEX \`IDX_87777ca8ac212b8357637794d6\` (\`locationId\`)`
    );

    // Migrate the profileData from aspects
    const aspects: any[] = await queryRunner.query(
      `SELECT id, profileId from aspect`
    );
    for (const aspect of aspects) {
      const newCardProfileID = randomUUID();
      const profiles: any[] = await queryRunner.query(
        `SELECT id, createdDate, updatedDate, version, authorizationId, description, locationId, displayName from profile WHERE (id = '${aspect.profileId}'`
      );
      const oldProfile = profiles[0];
      const tagsets: any[] = await queryRunner.query(
        `SELECT id, profileId from tagset`
      );
      const tagset = tagsets[0];
      await queryRunner.query(
        `INSERT INTO card_profile (id, createdDate, updatedDate, version, authorizationId, locationId, description, tagsetId)
            VALUES ('${newCardProfileID}',
                    '${oldProfile.createdDate}',
                    '${oldProfile.updatedDate}',
                    '${oldProfile.version}',
                    '${oldProfile.authorizationId}',
                    '${oldProfile.locationId}',
                    '${escapeString(oldProfile.description)}'
                    '${tagset.id}')`
      );

      // Update the tagset to be one of many
      await queryRunner.query(
        `UPDATE tagset SET profileId = 'null' WHERE (id = '${tagset.id}')`
      );

      // Update the references to be parented on the new profile
      await queryRunner.query(
        `UPDATE reference SET cardProfileId = '${newCardProfileID}', rofileId = 'null' WHERE (profileId = '${oldProfile.id}')`
      );
    }

    // Migrate the profileData from calendar events
    const events: any[] = await queryRunner.query(
      `SELECT id, profileId from calendar_event`
    );
    for (const event of events) {
      const newCardProfileID = randomUUID();
      const profiles: any[] = await queryRunner.query(
        `SELECT id, createdDate, updatedDate, version, authorizationId, description, locationId, displayName from profile WHERE (id = '${event.profileId}'`
      );
      const oldProfile = profiles[0];
      const tagsets: any[] = await queryRunner.query(
        `SELECT id, profileId from tagset`
      );
      const tagset = tagsets[0];
      await queryRunner.query(
        `INSERT INTO card_profile (id, createdDate, updatedDate, version, authorizationId, locationId, description, tagsetId)
            VALUES ('${newCardProfileID}',
                    '${oldProfile.createdDate}',
                    '${oldProfile.updatedDate}',
                    '${oldProfile.version}',
                    '${oldProfile.authorizationId}',
                    '${oldProfile.locationId}',
                    '${escapeString(oldProfile.description)}'
                    '${tagset.id}')`
      );

      // Update the tagset to be one to one
      await queryRunner.query(
        `UPDATE tagset SET profileId = 'null' WHERE (id = '${tagset.id}')`
      );

      // Update the references to be parented on the card profile
      await queryRunner.query(
        `UPDATE reference SET cardProfileId = '${newCardProfileID}', profileId = 'null' WHERE (profileId = '${oldProfile.id}')`
      );
    }
  }
}
