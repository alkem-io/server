import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class location1651384201504 implements MigrationInterface {
  name = 'location1651384201504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`location\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`city\` varchar(255) NOT NULL,  \`country\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    // Add location to profiles
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`locationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_77777ca8ac212b8357637794d6\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_77777ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    const profiles: any[] = await queryRunner.query(`SELECT id from profile`);
    for (const profile of profiles) {
      console.log(`Retrieved profile with id: ${profile.id}`);
      const locationID = randomUUID();
      await queryRunner.query(
        `INSERT INTO location (id, version, city, country)
            values ('${locationID}', 1,  '', '')`
      );
      await queryRunner.query(
        `UPDATE profile SET locationId = '${locationID}' WHERE (id = '${profile.id}')`
      );
    }

    // Copy over the user city / country fields
    const userProfiles: any[] = await queryRunner.query(
      `SELECT id, profileId, city, country FROM user`
    );
    for (const userProfile of userProfiles) {
      console.log(`Updating user with profile id: ${userProfile.profileId}`);
      const profiles: any[] = await queryRunner.query(
        `SELECT id, locationId FROM profile  WHERE (id = '${userProfile.profileId}')`
      );
      if (profiles.length === 1) {
        const profile = profiles[0];
        await queryRunner.query(
          `UPDATE location SET city = '${escapeString(
            userProfile.city
          )}' WHERE (id = '${profile.locationId}')`
        );
        await queryRunner.query(
          `UPDATE location SET country = '${escapeString(
            userProfile.country
          )}' WHERE (id = '${profile.locationId}')`
        );
      }
    }
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`city\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`country\``);

    // Add location to context
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`locationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD UNIQUE INDEX \`IDX_88888ca8ac212b8357637794d6\` (\`locationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_88888ca8ac212b8357637794d6f\` FOREIGN KEY (\`locationId\`) REFERENCES \`location\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    const contexts: any[] = await queryRunner.query(`SELECT id from context`);
    for (const context of contexts) {
      console.log(`Retrieved context with id: ${context.id}`);
      const locationID = randomUUID();
      await queryRunner.query(
        `INSERT INTO location (id, version, city, country)
                values ('${locationID}', 1,  '', '')`
      );
      await queryRunner.query(
        `UPDATE context SET locationId = '${locationID}' WHERE (id = '${context.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`city\` varchar(255) NOT NULL, ADD  \`country\` varchar(255) NOT NULL`
    );

    const userProfiles: any[] = await queryRunner.query(
      `SELECT id, profileId, city, country FROM user`
    );
    for (const userProfile of userProfiles) {
      console.log(`Updating user with profile id: ${userProfile.profileId}`);
      const profiles: any[] = await queryRunner.query(
        `SELECT id, locationId FROM profile  WHERE (id = '${userProfile.profileId}')`
      );
      if (profiles.length === 1) {
        const profile = profiles[0];
        const locations: any[] = await queryRunner.query(
          `SELECT id, city, country FROM location  WHERE (id = '${profile.locationId}')`
        );
        if (locations.length === 1) {
          const location = locations[0];
          await queryRunner.query(
            `UPDATE user SET city = '${location.city}', country = '${location.country}' WHERE (id = '${userProfile.id}')`
          );
        }
      }
    }

    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_88888ca8ac212b8357637794d6f\`, DROP COLUMN \`locationId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_77777ca8ac212b8357637794d6f\`, DROP COLUMN \`locationId\``
    );

    await queryRunner.query('DROP TABLE `location`');
  }
}
