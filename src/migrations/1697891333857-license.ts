import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class license1697891333857 implements MigrationInterface {
  name = 'license1697891333857';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`license\` (
                                    \`id\` char(36) NOT NULL,
                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                    \`version\` int NOT NULL,
                                    \`featureFlags\` text NOT NULL,
                                    \`visibility\` varchar(255) NULL
                                    \`authorizationId\` char(36) NULL,
                                    UNIQUE INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` (\`authorizationId\`),
                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`licenseId\` char(36) NULL`
    );

    const spaces: {
      id: string;
      visibility: string;
    }[] = await queryRunner.query(`SELECT id, visibility FROM space`);
    for (const space of spaces) {
      await this.createLicense(queryRunner, space.id, space.visibility);
    }

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`visibility\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // license ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`license\` DROP FOREIGN KEY \`FK_bfd01743815f0dd68ac1c5c45c0\``
    );
    // space ==> license
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_3ef80ef55ba1a1d45e625ea8389\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`visibility\` varchar(255) NULL`
    );

    const spaces: {
      id: string;
      licenseId: string;
    }[] = await queryRunner.query(`SELECT id, licenseId FROM space`);
    for (const space of spaces) {
      const [license]: {
        id: string;
        visibility: string;
      }[] = await queryRunner.query(
        `SELECT id, visibility FROM license WHERE (id = '${space.licenseId}')`
      );
      await queryRunner.query(
        `UPDATE \`space\` SET visibility = '${license.visibility}' WHERE (id = '${space.id}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` ON \`license\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`licenseId\``);
    await queryRunner.query(`DROP TABLE \`license\``);
  }

  private async createLicense(
    queryRunner: QueryRunner,
    spaceID: string,
    visibility: string
  ): Promise<string> {
    const licenseID = randomUUID();
    const licenseAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${licenseAuthID}',
        1, '', '', 0, '')`
    );

    const featureFlags = '[]';
    await queryRunner.query(
      `INSERT INTO license (id, version, authorizationId, featureFlags, visibility)
            VALUES ('${licenseID}',
                    '1',
                    '${licenseAuthID}',
                    '${featureFlags}',
                    '${visibility}')`
    );

    await queryRunner.query(
      `UPDATE \`space\` SET licenseId = '${licenseID}' WHERE (id = '${spaceID}')`
    );

    return licenseID;
  }
}
