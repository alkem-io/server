import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class library1667420764375 implements MigrationInterface {
  name = 'library1667420764375';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Library
    await queryRunner.query(
      `CREATE TABLE \`library\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL,
              \`authorizationId\` varchar(36) NULL,
                UNIQUE INDEX \`REL_33333ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`library\` ADD CONSTRAINT \`FK_33333901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create innovatonPack
    await queryRunner.query(
      `CREATE TABLE \`innovation_pack\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                 \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  \`version\` int NOT NULL,
                  \`authorizationId\` varchar(36) NULL,
                  \`libraryId\` varchar(36) NULL,
                    UNIQUE INDEX \`REL_22222ccdda9ba57d8e3a634cd8\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_22222901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Link innovation_pack to library
    await queryRunner.query(
      `ALTER TABLE \`innovation_pack\` ADD CONSTRAINT \`FK_77777450cf75dc486700ca034c6\` FOREIGN KEY (\`libraryId\`) REFERENCES \`library\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // create library instance with authorization
    const authID = randomUUID();
    const libraryID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO library (id, createdDate, updatedDate, version, authorizationId) VALUES ('${libraryID}', NOW(), NOW(), 1, '${authID}')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `innovation-pack`');
    await queryRunner.query('DROP TABLE `library`');
  }
}
