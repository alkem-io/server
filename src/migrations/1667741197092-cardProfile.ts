import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class cardProfile1667741197092 implements MigrationInterface {
  name = 'cardProfile1667741197092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the card profile entity definition
    // Create templates_set
    await queryRunner.query(
      `CREATE TABLE \`card_profile\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL,
               \`authorizationId\` varchar(36) NULL,
               \`description\` text NULL,
                \`tagsetId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_33888ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_22223901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_44443901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Update the aspect entity definition to add new column
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`profileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_67663901817dd09d5906537e088\` FOREIGN KEY (\`profileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Update where references point to, first dropping FK to aspect
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`cardProfileId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_282838434c7198a323ea6f475fb\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Migrate the data
    const aspects: { id: string; description: string; tagsetId: string }[] =
      await queryRunner.query(`SELECT id, description, tagsetId from aspect`);
    for (const aspect of aspects) {
      // create library instance with authorization
      const authID = randomUUID();
      const cardProfileID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO card_profile (id, createdDate, updatedDate, version, authorizationId, tagsetId, description)
         VALUES ('${cardProfileID}', NOW(), NOW(), 1, '${authID}', ${
          aspect.tagsetId ? "'" + aspect.tagsetId + "'" : aspect.tagsetId
        }, '${escapeString(aspect.description)}')`
      );

      await queryRunner.query(
        `UPDATE aspect SET \`profileId\` = '${cardProfileID}' WHERE \`id\` = '${aspect.id}'`
      );

      queryRunner.query(
        `UPDATE reference SET cardProfileId = '${cardProfileID}' WHERE aspectId = '${aspect.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_a21a8eda24f18cd6af58b0d4e72\``
    );
    await queryRunner.query('ALTER TABLE `reference` DROP `aspectId`;');

    // Remove old entity definition fields no longer needed: tagset, description
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_bd7b636888fc391cf1d7406e891\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`tagsetId\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`tagsetId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_bd7b636888fc391cf1d7406e891\`
       FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`)
        ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`description\` text NULL`
    );

    // Revert the reference FK + name
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`aspectId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_a21a8eda24f18cd6af58b0d4e72\`
       FOREIGN KEY (\`aspectId\`) REFERENCES \`aspect\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Migrate the data
    const aspects: {
      id: string;
      cardProfileId: string;
      description: string;
      tagsetId: string;
    }[] = await queryRunner.query(
      `SELECT aspect.id AS id, aspect.profileId AS cardProfileId, card_profile.description AS description, card_profile.tagsetId AS tagsetId FROM aspect LEFT JOIN card_profile ON card_profile.id = aspect.profileId`
    );
    for (const aspect of aspects) {
      await queryRunner.query(
        `UPDATE aspect SET description = '${escapeString(
          aspect.description
        )}', tagsetId = '${aspect.tagsetId}' WHERE \`id\` = '${aspect.id}'`
      );

      await queryRunner.query(
        `UPDATE reference SET aspectId = '${aspect.id}' WHERE cardProfileId = '${aspect.cardProfileId}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_282838434c7198a323ea6f475fb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`cardProfileId\``
    );
    // Drop the link to profile (card profile)
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_67663901817dd09d5906537e088\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`profileId\``);

    // drop the card profile table
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_44443901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_22223901817dd09d5906537e088\``
    );

    await queryRunner.query('DROP TABLE `card_profile`');
  }
}
