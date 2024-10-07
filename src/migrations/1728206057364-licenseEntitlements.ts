import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { query } from 'express';

export class LicenseEntitlements1728206057364 implements MigrationInterface {
  name = 'LicenseEntitlements1728206057364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_3030904030f5d30f483b49905d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_425bbb4b951f7f4629710763fc0\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_81f92b22d30540102e9654e892\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_dea52ce918df6950019678fa35\` ON \`space\``
    );
    await queryRunner.renameColumn(
      'license_plan',
      'licensingId',
      'licensingFrameworkId'
    );
    await queryRunner.renameColumn(
      'platform',
      'licensingId',
      'licensingFrameworkId'
    );

    await queryRunner.renameTable('licensing', 'licensing_framework');

    await queryRunner.query(`CREATE TABLE \`license_entitlement\` (\`id\` char(36) NOT NULL,
                                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                \`version\` int NOT NULL, \`type\` varchar(128) NOT NULL,
                                                                \`dataType\` varchar(128) NOT NULL,
                                                                \`limit\` int NOT NULL,
                                                                \`enabled\` tinyint NOT NULL,
                                                                \`licenseId\` char(36) NULL,
                                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`license\` (\`id\` char(36) NOT NULL,
                                                           \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                           \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                           \`version\` int NOT NULL,
                                                           \`type\` varchar(128) NOT NULL,
                                                           \`authorizationId\` char(36) NULL,
                                                           UNIQUE INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` (\`authorizationId\`),
                                                           PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD \`externalSubscriptionID\` varchar(128) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_8339e62882f239dc00ff5866f8\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD UNIQUE INDEX \`IDX_77f80ef55ba1a1d45e625ea838\` (\`licenseId\`)`
    );

    // Create the license entries with default values
    const accounts: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`account\``);
    for (const account of accounts) {
      const licenseID = await this.createLicense(queryRunner, 'account');
      await queryRunner.query(
        `UPDATE account SET licenseId = '${licenseID}' WHERE id = '${account.id}'`
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_SPACE,
        LicenseEntitlementDataType.LIMIT
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        LicenseEntitlementDataType.LIMIT
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
        LicenseEntitlementDataType.LIMIT
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
        LicenseEntitlementDataType.LIMIT
      );
    }

    const spaces: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`space\``);
    for (const space of spaces) {
      const licenseID = await this.createLicense(queryRunner, 'space');
      await queryRunner.query(
        `UPDATE space SET licenseId = '${licenseID}' WHERE id = '${space.id}'`
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
        LicenseEntitlementDataType.FLAG
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        LicenseEntitlementDataType.FLAG
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        LicenseEntitlementDataType.FLAG
      );
    }

    const roleSets: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`role_set\``);
    for (const roleSet of roleSets) {
      const licenseID = await this.createLicense(queryRunner, 'roleset');
      await queryRunner.query(
        `UPDATE role_set SET licenseId = '${licenseID}' WHERE id = '${roleSet.id}'`
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        LicenseEntitlementDataType.FLAG
      );
    }

    const collaborations: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`collaboration\``);
    for (const collaboration of collaborations) {
      const licenseID = await this.createLicense(queryRunner, 'collaboration');
      await queryRunner.query(
        `UPDATE collaboration SET licenseId = '${licenseID}' WHERE id = '${collaboration.id}'`
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
        LicenseEntitlementDataType.FLAG
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        LicenseEntitlementDataType.FLAG
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3ef80ef55ba1a1d45e625ea838\` ON \`space\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8339e62882f239dc00ff5866f8\` ON \`account\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` ADD CONSTRAINT \`FK_44e464f560f510b9fc5fa073397\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license\` ADD CONSTRAINT \`FK_bfd01743815f0dd68ac1c5c45c0\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_8339e62882f239dc00ff5866f8c\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_8339e62882f239dc00ff5866f8c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_3ef80ef55ba1a1d45e625ea8389\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license\` DROP FOREIGN KEY \`FK_bfd01743815f0dd68ac1c5c45c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` DROP FOREIGN KEY \`FK_44e464f560f510b9fc5fa073397\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_36d8347a558f81ced8a621fe509\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_9f99adf29316d6aa1d0e8ecae54\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8339e62882f239dc00ff5866f8\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_36d8347a558f81ced8a621fe50\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_36d8347a558f81ced8a621fe50\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP INDEX \`IDX_8339e62882f239dc00ff5866f8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`licenseId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`externalSubscriptionID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\``
    );
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`licenseId\``);
    await queryRunner.query(
      `DROP INDEX \`REL_bfd01743815f0dd68ac1c5c45c\` ON \`license\``
    );
    await queryRunner.query(`DROP TABLE \`license\``);
    await queryRunner.query(`DROP TABLE \`license_entitlement\``);

    await queryRunner.query(
      `ALTER TABLE \`platform\` CHANGE \`licensingFrameworkId\` \`licensingId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` CHANGE \`licensingFrameworkId\` \`licensingId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_dea52ce918df6950019678fa35\` ON \`space\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\` (\`licensingId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_81f92b22d30540102e9654e892\` ON \`platform\` (\`templatesManagerId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_425bbb4b951f7f4629710763fc0\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_3030904030f5d30f483b49905d1\` FOREIGN KEY (\`licensingId\`) REFERENCES \`licensing\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                ('${authID}',
                1, '', '', 0, '', '${policyType}')`
    );
    return authID;
  }

  private async createLicense(
    queryRunner: QueryRunner,
    type: string
  ): Promise<string> {
    const templateDefaultID = randomUUID();
    const templateDefaultAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'license'
    );
    await queryRunner.query(
      `INSERT INTO license (id, version, type, authorizationId) VALUES
                (
                '${templateDefaultID}',
                1,
                '${type}',
                '${templateDefaultAuthID}')`
    );
    return templateDefaultID;
  }

  private async createLicenseEntitlement(
    queryRunner: QueryRunner,
    licenseID: string,
    entitlementType: LicenseEntitlementType,
    entitlementDataType: LicenseEntitlementDataType
  ): Promise<string> {
    const licenseEntitlementID = randomUUID();

    await queryRunner.query(
      `INSERT INTO license_entitlement (id, version, type, dataType, license_entitlement.limit, enabled, licenseId) VALUES
                (
                '${licenseEntitlementID}',
                1,
                '${entitlementType}',
                '${entitlementDataType}',
                0,
                0,
                '${licenseID}'
                )`
    );
    return licenseEntitlementID;
  }
}

enum LicenseEntitlementType {
  ACCOUNT_SPACE = 'account-space',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'account-virtual-contributor',
  ACCOUNT_INNOVATION_PACK = 'account-innovation-pack',
  ACCOUNT_INNOVATION_HUB = 'account-innovation-hub',
  SPACE_FLAG_SAVE_AS_TEMPLATE = 'space-flag-save-as-template',
  SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-flag-virtual-contributor-access',
  SPACE_FLAG_WHITEBOARD_MULTI_USER = 'space-flag-whiteboard-multi-user',
}

enum LicenseEntitlementDataType {
  LIMIT = 'limit',
  FLAG = 'flag',
}
