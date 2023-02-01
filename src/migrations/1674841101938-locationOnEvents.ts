import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class locationOnEvents1674841101938 implements MigrationInterface {
  name = 'locationOnEvents1674841101938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add location to profiles
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD \`locationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD UNIQUE INDEX \`IDX_87777ca8ac212b8357637794d6\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` ADD CONSTRAINT \`FK_87777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`addressLine1\` varchar(128) NOT NULL DEFAULT '',
                                ADD \`addressLine2\` varchar(128) NOT NULL DEFAULT '',
                                ADD \`stateOrProvince\` varchar(128) NOT NULL DEFAULT '',
                                ADD \`postalCode\` varchar(128) NOT NULL DEFAULT ''`
    );

    const cardProfiles: any[] = await queryRunner.query(
      `SELECT id from card_profile`
    );
    for (const cardProfile of cardProfiles) {
      console.log(`Retrieved profile with id: ${cardProfile.id}`);
      const locationID = randomUUID();
      await queryRunner.query(
        `INSERT INTO location (id, version, city, country)
            values ('${locationID}', 1,  '', '')`
      );
      await queryRunner.query(
        `UPDATE card_profile SET locationId = '${locationID}' WHERE (id = '${cardProfile.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP FOREIGN KEY \`FK_87777ca8ac212b8357637794d6f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`card_profile\` DROP INDEX \`IDX_87777ca8ac212b8357637794d6\`, DROP COLUMN \`locationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`addressLine1\`, DROP COLUMN \`addressLine2\`, DROP COLUMN \`stateOrProvince\`, DROP COLUMN \`postalCode\``
    );
  }
}
