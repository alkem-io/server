import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class license1698347479999 implements MigrationInterface {
  name = 'license1698347479999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`feature_flag\` (
        \`id\` char(36) NOT NULL,
        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`version\` int NOT NULL,
        \`name\` text NOT NULL,
        \`enabled\` boolean NOT NULL,
        \`licenseId\` char(36) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`
    );

    await queryRunner.query(`CREATE TABLE \`license\` (
                                    \`id\` char(36) NOT NULL,
                                    \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                    \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                    \`version\` int NOT NULL,
                                    \`visibility\` varchar(36) NULL DEFAULT 'active',
                                    \`authorizationId\` char(36) NULL,
                                    UNIQUE INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` (\`authorizationId\`),
                                    PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` ADD CONSTRAINT \`FK_7e3e0a8b6d3e9b4a3a0d6e3a3e3\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`license\` ADD CONSTRAINT \`FK_bfd01743815f0dd68ac1c5c45c0\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard_rt\` ADD \`contentUpdatePolicy\` varchar(255) NULL`
    );

    const spaces: {
      id: string;
      visibility: string;
    }[] = await queryRunner.query(`SELECT id, visibility FROM space`);
    for (const space of spaces) {
      await this.createLicense(queryRunner, space.id, space.visibility);
    }

    const whiteboardRts: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM whiteboard_rt`);
    for (const whiteboardRt of whiteboardRts) {
      await queryRunner.query(
        `UPDATE \`whiteboard_rt\` SET contentUpdatePolicy = 'owner-contributors' WHERE (id = '${whiteboardRt.id}')`
      );
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
      `DROP INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` ON \`license\``
    );

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`licenseId\``);
    await queryRunner.query(`DROP TABLE \`license\``);
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_rt\` DROP COLUMN \`contentUpdatePolicy\``
    );
  }

  private async createLicense(
    queryRunner: QueryRunner,
    spaceID: string,
    visibility: string
  ): Promise<string> {
    const licenseID = randomUUID();
    const licenseAuthID = randomUUID();

    // Create and associate FeatureFlag entities with Licenses
    const featureFlagData = [
      { name: 'whiteboard-rt', value: false },
      { name: 'callout-to-callout-template', value: false },
      // Add more feature flags as needed
    ];

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${licenseAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO license (id, version, authorizationId, visibility)
            VALUES ('${licenseID}',
                    '1',
                    '${licenseAuthID}',
                    '${visibility}')`
    );

    for (const flag of featureFlagData) {
      const flagID = randomUUID();

      await queryRunner.query(
        `INSERT INTO \`feature_flag\` (\`id\`, \`version\`,  \`name\`, \`enabled\`, \`licenseId\`)
            VALUES (?, ?, ?, ?, ?)`,
        [flagID, 1, flag.name, flag.value, licenseID] // Set licenseId to null initially
      );
    }

    await queryRunner.query(
      `UPDATE \`space\` SET licenseId = '${licenseID}' WHERE (id = '${spaceID}')`
    );

    return licenseID;
  }
}
