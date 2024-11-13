import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { query } from 'express';

export class LicenseEntitlements1731500015640 implements MigrationInterface {
  name = 'LicenseEntitlements1731500015640';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_3030904030f5d30f483b49905d1\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_425bbb4b951f7f4629710763fc0\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_425bbb4b951f7f4629710763fc\` ON \`platform\``
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

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_99f80ef55ba1a1d45e625ea838\` (\`licenseId\`)`
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
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        LicenseEntitlementDataType.LIMIT
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
        LicenseEntitlementDataType.LIMIT
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
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
        LicenseEntitlementType.SPACE_FREE,
        LicenseEntitlementDataType.FLAG
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_PLUS,
        LicenseEntitlementDataType.FLAG
      );
      await this.createLicenseEntitlement(
        queryRunner,
        licenseID,
        LicenseEntitlementType.SPACE_PREMIUM,
        LicenseEntitlementDataType.FLAG
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

    const licensePolicies: {
      id: string;
      credentialRulesStr: string;
    }[] = await queryRunner.query(
      `SELECT id, credentialRulesStr FROM license_policy`
    );
    for (const policy of licensePolicies) {
      await queryRunner.query(
        `UPDATE license_policy SET credentialRulesStr = '${JSON.stringify(licenseCredentialRules)}' WHERE id = '${policy.id}'`
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

    await this.convergeSchema(queryRunner);
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

  private async convergeSchema(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` DROP FOREIGN KEY \`FK_44e464f560f510b9fc5fa073397\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_99f80ef55ba1a1d45e625ea838\` ON \`collaboration\``
    );
    await queryRunner.query(
      `DROP INDEX \`FK_3030904030f5d30f483b49905d1\` ON \`license_plan\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_77f80ef55ba1a1d45e625ea838\` ON \`role_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8339e62882f239dc00ff5866f8\` ON \`account\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD UNIQUE INDEX \`IDX_aa5815c9577533141cbc4aebe9\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP FOREIGN KEY \`FK_29b5cd2c555b47f80942dfa4aa7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP FOREIGN KEY \`FK_427ff5dfcabbc692ed6d71acaea\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD UNIQUE INDEX \`IDX_29b5cd2c555b47f80942dfa4aa\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD UNIQUE INDEX \`IDX_427ff5dfcabbc692ed6d71acae\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_36d8347a558f81ced8a621fe50\` (\`licensingFrameworkId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD UNIQUE INDEX \`IDX_c25bfb0c837427dd54e250b240\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_aa5815c9577533141cbc4aebe9\` ON \`collaboration\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_29b5cd2c555b47f80942dfa4aa\` ON \`licensing_framework\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_427ff5dfcabbc692ed6d71acae\` ON \`licensing_framework\` (\`licensePolicyId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_36d8347a558f81ced8a621fe50\` ON \`platform\` (\`licensingFrameworkId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c25bfb0c837427dd54e250b240\` ON \`role_set\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` ADD CONSTRAINT \`FK_badab780c9f3e196d98ab324686\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_aa5815c9577533141cbc4aebe9f\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD CONSTRAINT \`FK_9f99adf29316d6aa1d0e8ecae54\` FOREIGN KEY (\`licensingFrameworkId\`) REFERENCES \`licensing_framework\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD CONSTRAINT \`FK_29b5cd2c555b47f80942dfa4aa7\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD CONSTRAINT \`FK_427ff5dfcabbc692ed6d71acaea\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_36d8347a558f81ced8a621fe509\` FOREIGN KEY (\`licensingFrameworkId\`) REFERENCES \`licensing_framework\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_c25bfb0c837427dd54e250b240e\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'DROP INDEX `IDX_aa5815c9577533141cbc4aebe9` ON `collaboration`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_29b5cd2c555b47f80942dfa4aa` ON `licensing_framework`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_427ff5dfcabbc692ed6d71acae` ON `licensing_framework`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_0c6a4d0a6c13a3f5df6ac01509` ON `licensing_framework`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_a5dae5a376dd49c7c076893d40` ON `licensing_framework`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_36d8347a558f81ced8a621fe50` ON `platform`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c25bfb0c837427dd54e250b240` ON `role_set`'
    );
  }

  private async divergeSchema(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_c25bfb0c837427dd54e250b240e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_36d8347a558f81ced8a621fe509\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP FOREIGN KEY \`FK_427ff5dfcabbc692ed6d71acaea\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP FOREIGN KEY \`FK_29b5cd2c555b47f80942dfa4aa7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP FOREIGN KEY \`FK_9f99adf29316d6aa1d0e8ecae54\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_aa5815c9577533141cbc4aebe9f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` DROP FOREIGN KEY \`FK_badab780c9f3e196d98ab324686\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c25bfb0c837427dd54e250b240\` ON \`role_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_36d8347a558f81ced8a621fe50\` ON \`platform\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_427ff5dfcabbc692ed6d71acae\` ON \`licensing_framework\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_29b5cd2c555b47f80942dfa4aa\` ON \`licensing_framework\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_aa5815c9577533141cbc4aebe9\` ON \`collaboration\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP INDEX \`IDX_c25bfb0c837427dd54e250b240\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_36d8347a558f81ced8a621fe50\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP INDEX \`IDX_427ff5dfcabbc692ed6d71acae\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` DROP INDEX \`IDX_29b5cd2c555b47f80942dfa4aa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD CONSTRAINT \`FK_427ff5dfcabbc692ed6d71acaea\` FOREIGN KEY (\`licensePolicyId\`) REFERENCES \`license_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`licensing_framework\` ADD CONSTRAINT \`FK_29b5cd2c555b47f80942dfa4aa7\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP INDEX \`IDX_aa5815c9577533141cbc4aebe9\``
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_8339e62882f239dc00ff5866f8\` ON \`account\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_77f80ef55ba1a1d45e625ea838\` ON \`role_set\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_0c6a4d0a6c13a3f5df6ac01509\` ON \`licensing_framework\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_3030904030f5d30f483b49905d1\` ON \`license_plan\` (\`licensingFrameworkId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_99f80ef55ba1a1d45e625ea838\` ON \`collaboration\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_entitlement\` ADD CONSTRAINT \`FK_44e464f560f510b9fc5fa073397\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c25bfb0c837427dd54e250b240` ON `role_set` (`licenseId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_36d8347a558f81ced8a621fe50` ON `platform` (`licensingFrameworkId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_a5dae5a376dd49c7c076893d40` ON `licensing_framework` (`licensePolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_0c6a4d0a6c13a3f5df6ac01509` ON `licensing_framework` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_427ff5dfcabbc692ed6d71acae` ON `licensing_framework` (`licensePolicyId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_29b5cd2c555b47f80942dfa4aa` ON `licensing_framework` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_aa5815c9577533141cbc4aebe9` ON `collaboration` (`licenseId`)'
    );

    await this.divergeSchema(queryRunner);
  }
}

enum LicenseEntitlementType {
  ACCOUNT_SPACE_FREE = 'account-space-free',
  ACCOUNT_SPACE_PLUS = 'account-space-plus',
  ACCOUNT_SPACE_PREMIUM = 'account-space-premium',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'account-virtual-contributor',
  ACCOUNT_INNOVATION_PACK = 'account-innovation-pack',
  ACCOUNT_INNOVATION_HUB = 'account-innovation-hub',
  SPACE_FREE = 'space-free',
  SPACE_PLUS = 'space-plus',
  SPACE_PREMIUM = 'space-premium',
  SPACE_FLAG_SAVE_AS_TEMPLATE = 'space-flag-save-as-template',
  SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-flag-virtual-contributor-access',
  SPACE_FLAG_WHITEBOARD_MULTI_USER = 'space-flag-whiteboard-multi-user',
}

enum LicenseEntitlementDataType {
  LIMIT = 'limit',
  FLAG = 'flag',
}

const licenseCredentialRules = [
  {
    credentialType: 'space-feature-virtual-contributors',
    grantedEntitlements: [
      LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
    ],
    name: 'Space Virtual Contributors',
  },
  {
    credentialType: 'space-feature-whiteboard-multi-user',
    grantedEntitlements: [
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
    ],
    name: 'Space Multi-user whiteboards',
  },
  {
    credentialType: 'space-feature-save-as-template',
    grantedEntitlements: [LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE],
    name: 'Space Save As Templatet',
  },
  {
    credentialType: 'space-license-free',
    grantedEntitlements: [LicenseEntitlementType.SPACE_FREE],
    name: 'Space License Free',
  },
  {
    credentialType: 'space-license-plus',
    grantedEntitlements: [
      LicenseEntitlementType.SPACE_PLUS,
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
      LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
    ],
    name: 'Space License Plus',
  },
  {
    credentialType: 'space-license-premium',
    grantedEntitlements: [
      LicenseEntitlementType.SPACE_PREMIUM,
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
      LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
    ],
    name: 'Space License Premium',
  },
  {
    credentialType: 'account-license-plus',
    grantedEntitlements: [
      LicenseEntitlementType.ACCOUNT_SPACE_FREE,
      LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
      LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
      LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
    ],
    name: 'Account License Plus',
  },
];
