import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class licensing1716108478921 implements MigrationInterface {
  name = 'licensing1716108478921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`licensing\` (\`id\` char(36) NOT NULL,
                                                                 \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                 \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                 \`version\` int NOT NULL,
                                                                 \`authorizationId\` char(36) NULL,
                                                                 \`licensePolicyId\` char(36) NULL,
                                                                 UNIQUE INDEX \`REL_1ddac8984c93ca18a23edb30fc\` (\`authorizationId\`),
                                                                 UNIQUE INDEX \`REL_65ca04c85acdd5dad63f557609\` (\`licensePolicyId\`),
                                                                 PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`license_plan\` (\`id\` char(36) NOT NULL,
                                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                \`version\` int NOT NULL,
                                                                \`name\` text NOT NULL,
                                                                \`enabled\` tinyint NOT NULL,
                                                                \`licensingId\` char(36) NULL,
                                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    // Drop constraints platform ==> license policy
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_bde2e6ff4a8d800388bcee8057e\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bde2e6ff4a8d800388bcee8057\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_bde2e6ff4a8d800388bcee8057\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`licensingId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_1282e7fa19848d4b4bc3a4829d\` (\`licensingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1282e7fa19848d4b4bc3a4829d\` ON \`platform\` (\`licensingId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_1ddac8984c93ca18a23edb30fc9\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD CONSTRAINT \`FK_65ca04c85acdd5dad63f5576094\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_42becb5fd6dc563f51ecb71abcc\` FOREIGN KEY (\`licenseManagerId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_1282e7fa19848d4b4bc3a4829db\` FOREIGN KEY (\`licenseManagerId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create the agent on each account
    const [platform]: { id: string; licensePolicyId: string }[] =
      await queryRunner.query(`SELECT id, licensePolicyId FROM platform `);
    const licensingID = randomUUID();
    const licensingAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${licensingAuthID}',
                    1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO licensing (id, version, authorizationId, licensePolicyId) VALUES
                ('${licensingID}',
                1,
                '${licensingAuthID}',
                '${platform.licensePolicyId}')`
    );
    await queryRunner.query(
      `UPDATE platform SET licensingId = '${licensingID}' WHERE id = '${platform.id}'`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`licensePolicyId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
