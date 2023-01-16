import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class timeline1673901366302 implements MigrationInterface {
  name = 'timeline1673901366302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hub` ADD `timelineID` char(36) NOT NULL'
    );
    // Create timeline
    await queryRunner.query(
      `CREATE TABLE \`timeline\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                      \`version\` int NOT NULL,
                      \`authorizationId\` varchar(36) NULL,
                      \`calendarId\` varchar(36) NULL,
                        UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`timeline\` ADD CONSTRAINT \`FK_22443901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create calendar
    await queryRunner.query(
      `CREATE TABLE \`calendar\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
               \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`version\` int NOT NULL,
                \`authorizationId\` varchar(36) NULL,
                  UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` ADD CONSTRAINT \`FK_33355901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create calendar_events
    await queryRunner.query(
      `CREATE TABLE \`calendar_event\` (\`id\` char(36) NOT NULL,
                   \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                   \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                   \`startDate\` datetime(6) NULL,
                   \`duration\` int NULL,
                    \`wholeDay\` tinyint NULL,
                    \`multipleDays\` tinyint NULL,
                   \`multipleDaysDuration\` int NULL,
                   \`version\` int NOT NULL,
                    \`authorizationId\` char(36) NULL,
                    \`nameID\` varchar(36) NOT NULL,
                    \`displayName\` varchar(255) NOT NULL,
                    \`calendarId\` char(36) NULL,
                    \`cardProfileId\` char(36) NULL,
                      UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_22255901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_111838434c7198a323ea6f475fb\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Link calendar_event to calendar
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_77755450cf75dc486700ca034c6\` FOREIGN KEY (\`calendarId\`) REFERENCES \`calendar\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    const hubs: { id: string }[] = await queryRunner.query(
      `SELECT id FROM hub`
    );
    for (const hub of hubs) {
      // create calendar instance with authorization
      const calendarAuthID = randomUUID();
      const calendarID = randomUUID();
      const timelineAuthID = randomUUID();
      const timelineID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${calendarAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO calendar (id, createdDate, updatedDate, version, authorizationId) VALUES ('${calendarID}', NOW(), NOW(), 1, '${calendarAuthID}')`
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${timelineAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO timeline (id, createdDate, updatedDate, version, authorizationId, calendarId) VALUES ('${timelineID}', NOW(), NOW(), 1, '${timelineAuthID}', '${calendarID}')`
      );
      await queryRunner.query(
        `UPDATE hub SET timelineId = '${timelineID}' WHERE id = '${hub.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`timeline\` DROP FOREIGN KEY \`FK_22443901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar\` DROP FOREIGN KEY \`FK_33355901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_22255901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_77755450cf75dc486700ca034c6\``
    );

    await queryRunner.query('DROP TABLE `calendar_event`');
    await queryRunner.query('DROP TABLE `calendar`');
    await queryRunner.query('DROP TABLE `timeline`');

    await queryRunner.query('ALTER TABLE `hub` DROP COLUMN `timelineID`');
  }
}
