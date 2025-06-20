import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CalloutsRefresh1750169607272 implements MigrationInterface {
  name = 'CalloutsRefresh1750169607272'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the new callout_settings table
    await queryRunner.query(`CREATE TABLE \`callout_settings\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`visibility\` varchar(128) NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_e09a98b8ead94bf55576d5352e\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`ALTER TABLE \`callout\` ADD \`settingsId\` char(36) NULL`);
    // Migrate existing callout visibility to callout_settings
    const callouts: {
      id: string;
      visibility: string;
    }[] = await queryRunner.query(`SELECT \`id\`, \`visibility\` FROM \`callout\`;`);
    for (const callout of callouts) {
      const settingsId = randomUUID();
      await queryRunner.query(
        `INSERT INTO \`callout_settings\` (\`id\`, \`createdDate\`, \`updatedDate\`, \`version\`, \`visibility\`)
          VALUES (?, NOW(), NOW(), 1, ?)`,
          [settingsId, callout.visibility]
      );
      await queryRunner.query(
        `UPDATE \`callout\` SET \`settingsId\` = ? WHERE \`id\` = ?`,
        [settingsId, callout.id]
      );
    }

    // Create the constraints and indexes
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_d01538160260d354619525db68\` ON \`callout\` (\`settingsId\`)`);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` ADD CONSTRAINT \`FK_e09a98b8ead94bf55576d5352e9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_d01538160260d354619525db685\` FOREIGN KEY (\`settingsId\`) REFERENCES \`callout_settings\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

    // Delete the old visibility column from callout
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`visibility\``);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout\` ADD \`visibility\` varchar(128) NULL`);
    await queryRunner.query(`UPDATE \`callout\` SET \`visibility\` = (SELECT \`visibility\` FROM \`callout_settings\` WHERE \`id\` = \`settingsId\`) WHERE \`settingsId\` IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`callout\` CHANGE \`visibility\` \`visibility\` varchar(128) NOT NULL`);

    await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_d01538160260d354619525db685\``);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` DROP FOREIGN KEY \`FK_e09a98b8ead94bf55576d5352e9\``);
    await queryRunner.query(`DROP INDEX \`REL_d01538160260d354619525db68\` ON \`callout\``);
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`settingsId\``);
    await queryRunner.query(`DROP TABLE \`callout_settings\``);
  }
}

