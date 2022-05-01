import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

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
        `update profile set locationId = '${locationID}' WHERE (id = '${profile.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `location`');

    // todo: remove the location field and constraints
  }
}
