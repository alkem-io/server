import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class cardProfile1667741197092 implements MigrationInterface {
  name = 'cardProfile1667741197092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the card profile entity definition
    // Create templates_set
    // await queryRunner.query(
    //   `CREATE TABLE \`card_profile\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    //          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    //           \`version\` int NOT NULL,
    //            \`authorizationId\` varchar(36) NULL,
    //            \`description\` text NULL,
    //             \`tagsetId\` varchar(36) NULL
    //             ) ENGINE=InnoDB`
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_22223901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_44443901817dd09d5906537e088\` FOREIGN KEY (\`tagsetId\`) REFERENCES \`tagset\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    // );

    // // Update the aspect entity definition to add new column
    // await queryRunner.query(
    //   `ALTER TABLE \`aspect\` ADD \`cardProfileId\` varchar(36) NULL`
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_66663901817dd09d5906537e088\` FOREIGN KEY (\`cardProfileId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    // );

    // Migrate the data
    const aspects: any[] = await queryRunner.query(
      `SELECT id, description, tagsetId from aspect`
    );
    for (const aspect of aspects) {
      // create library instance with authorization
      const authID = randomUUID();
      const cardProfileID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO card_profile (id, createdDate, updatedDate, version, authorizationId, tagsetId, description) VALUES ('${cardProfileID}', NOW(), NOW(), 1, '${authID}', '${aspect.tagsetId}', '${aspect.description}')`
      );
    }

    // Update where references point to, first dropping FK to aspect
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_a21a8eda24f18cd6af58b0d4e72\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` RENAME COLUMN \`aspectId\` TO \`cardProfileId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_a21a8eda24f18cd6af58b0d4e72\` FOREIGN KEY (\`cardProfileIdId\`) REFERENCES \`card_profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Remove old entity definition fields no longer needed: tagset, description
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_bd7b636888fc391cf1d7406e891\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`tagsetId\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create the card profile entity definition
    // Update the aspect entity definition
    // update the reference entity definition
  }
}
