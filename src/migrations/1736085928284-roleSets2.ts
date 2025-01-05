import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleSets21736085928284 implements MigrationInterface {
  name = 'RoleSets21736085928284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_40f3ebb0c2a0b2a1557e67f849\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD \`type\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD UNIQUE INDEX \`IDX_857684833bbd26eff72f97bcfd\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_40f3ebb0c2a0b2a1557e67f849\` ON \`platform\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_857684833bbd26eff72f97bcfd\` ON \`organization\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_40f3ebb0c2a0b2a1557e67f8496\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_857684833bbd26eff72f97bcfdb\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Assign all current role sets the type of 'space'
    await queryRunner.query(`UPDATE \`role_set\` SET \`type\` = 'space'`);

    // Create the role set for the platform
    const platformRoleSetID = await this.createRoleSet(
      queryRunner,
      'subspace-admin',
      'platform',
      ['subspace-admin']
    );
    // set the role set for the platform
    await queryRunner.query(
      `UPDATE \`platform\` SET \`roleSetId\` = '${platformRoleSetID}'`
    );

    const organizations: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`organization\``);
    for (const organization of organizations) {
      // Create the role set for the organization
      const organizationRoleSetID = await this.createRoleSet(
        queryRunner,
        'subspace-admin',
        'organization',
        ['subspace-admin']
      );
      // set the role set for the organization
      await queryRunner.query(
        `UPDATE \`organization\` SET \`roleSetId\` = '${organizationRoleSetID}' WHERE id = '${organization.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_857684833bbd26eff72f97bcfdb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_40f3ebb0c2a0b2a1557e67f8496\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_857684833bbd26eff72f97bcfd\` ON \`organization\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_40f3ebb0c2a0b2a1557e67f849\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP INDEX \`IDX_857684833bbd26eff72f97bcfd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`roleSetId\``
    );
    await queryRunner.query(`ALTER TABLE \`role_set\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_40f3ebb0c2a0b2a1557e67f849\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`roleSetId\``
    );
  }

  private async createRoleSet(
    queryRunner: QueryRunner,
    entryRoleType: string,
    roleSetType: string,
    roles: string[]
  ): Promise<string> {
    const roleSetID = randomUUID();
    const roleSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'role-set'
    );

    const licenseID = await this.createLicense(
      queryRunner,
      roleSetLicenseEntitlements
    );

    await queryRunner.query(
      `INSERT INTO role_set (id,
                                version,
                                authorizationId,
                                entryRoleType,
                                licenseId,
                                type) VALUES
                        (
                        '${roleSetID}',
                        1,
                        '${roleSetAuthID}',
                        '${entryRoleType}',
                        '${licenseID}',
                        '${roleSetType}')`
    );

    // Add in the roles
    for (const role of roles) {
      const roleID = randomUUID();
      await queryRunner.query(
        `INSERT INTO role_set_role (id,
                                roleSetId,
                                role) VALUES
                        (
                        '${roleID}',
                        '${roleSetID}',
                        '${role}')`
      );
    }
    return roleSetID;
  }

  private async createLicense(
    queryRunner: QueryRunner,
    entitlements: LicenseEntitlement[]
  ): Promise<string> {
    const licenseID = randomUUID();
    const LicenseAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'license'
    );
    await queryRunner.query(
      `INSERT INTO license (id,
                                version,
                                authorizationId,
                                type) VALUES
                        (
                        '${licenseID}',
                        1,
                        '${LicenseAuthID}',
                        'role-set')`
    );

    // create the entitlements
    for (const entitlement of entitlements) {
      await queryRunner.query(
        `INSERT INTO license_entitlement (id,
                                licenseId,
                                type,
                                dataType,
                                limit,
                                enabled) VALUES
                        (
                        '${randomUUID()}',
                        '${licenseID}',
                        '${entitlement.type}',
                        '${entitlement.dataType},'
                        '${entitlement.limit}'
                        '${entitlement.enabled}')`
      );
    }
    return licenseID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
                        ('${authID}',
                        1, '[]', '[]', 0, '[]', '${policyType}')`
    );
    return authID;
  }
}

const roleSetLicenseEntitlements: LicenseEntitlement[] = [
  {
    type: 'space-flag-virtual-contributor-access',
    dataType: 'flag',
    limit: 999,
    enabled: true,
  },
];

type LicenseEntitlement = {
  type: string;
  dataType: string;
  limit: number;
  enabled: boolean;
};
