import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class platform1672762605571 implements MigrationInterface {
  name = 'platform1672762605571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Library
    await queryRunner.query(
      `CREATE TABLE \`platform\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
               \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`version\` int NOT NULL,
                \`authorizationId\` varchar(36) NULL,
                \`communicationId\` varchar(36) NULL,
                  UNIQUE INDEX \`REL_44333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_44333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // create platform instance with authorization
    const authID = randomUUID();
    const platformID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO platform (id, createdDate, updatedDate, version, authorizationId) VALUES ('${platformID}', NOW(), NOW(), 1, '${authID}')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_44333901817dd09d5906537e088\``
    );

    await queryRunner.query('DROP TABLE `platform`');
  }
}
