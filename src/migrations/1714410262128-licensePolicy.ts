import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class licensePolicy1714410262128 implements MigrationInterface {
  name = 'licensePolicy1714410262128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`license_policy\` (\`id\` char(36) NOT NULL,
                                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                \`version\` int NOT NULL,
                                                                \`featureFlagRules\` text NOT NULL,
                                                                \`authorizationId\` char(36) NULL,
                                                                UNIQUE INDEX \`REL_23d4d78ea8db637df031f86f03\` (\`authorizationId\`),
                                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`license_policy\` ADD CONSTRAINT \`FK_23d4d78ea8db637df031f86f030\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`licensePolicyId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_bde2e6ff4a8d800388bcee8057\` ON \`platform\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_bde2e6ff4a8d800388bcee8057\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_bde2e6ff4a8d800388bcee8057e\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const licensePolicyID = randomUUID();
    const licensePolicyAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${licensePolicyAuthID}',
                    1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO license_policy (id, version, authorizationId, featureFlagRules) VALUES
                ('${licensePolicyID}',
                1,
                '${licensePolicyAuthID}',
                '${JSON.stringify(licenseRules)}')`
    );
    await queryRunner.query(
      `UPDATE platform SET licensePolicyId = '${licensePolicyID}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_bde2e6ff4a8d800388bcee8057e\``
    );

    await queryRunner.query(
      `ALTER TABLE \`license_policy\` DROP FOREIGN KEY \`FK_23d4d78ea8db637df031f86f030\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_bde2e6ff4a8d800388bcee8057\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_bde2e6ff4a8d800388bcee8057\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_23d4d78ea8db637df031f86f03\` ON \`license_policy\``
    );
    await queryRunner.query(`DROP TABLE \`license_policy\``);
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`licensePolicyId\``
    );
  }
}

export type FeatureFlagRule = {
  featureFlagName: LicenseFeatureFlagName;
  grantedPrivileges: LicensePrivilege[];
  name: string;
};

export enum LicensePrivilege {
  VIRTUAL_CONTRIBUTOR_ACCESS = 'virtual-contributor-access',
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_SAVE_AS_TEMPLATE = 'callout-save-as-template',
}

export enum LicenseFeatureFlagName {
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_TO_CALLOUT_TEMPLATE = 'callout-to-callout-template',
  VIRTUAL_CONTRIBUTORS = 'virtual-contributors',
}

export const licenseRules: FeatureFlagRule[] = [
  {
    featureFlagName: LicenseFeatureFlagName.VIRTUAL_CONTRIBUTORS,
    grantedPrivileges: [LicensePrivilege.VIRTUAL_CONTRIBUTOR_ACCESS],
    name: 'Virtual Contributors',
  },
  {
    featureFlagName: LicenseFeatureFlagName.WHITEBOARD_MULTI_USER,
    grantedPrivileges: [LicensePrivilege.WHITEBOARD_MULTI_USER],
    name: 'Multi-user whiteboards',
  },
  {
    featureFlagName: LicenseFeatureFlagName.CALLOUT_TO_CALLOUT_TEMPLATE,
    grantedPrivileges: [LicensePrivilege.CALLOUT_SAVE_AS_TEMPLATE],
    name: 'Callout templates',
  },
];
