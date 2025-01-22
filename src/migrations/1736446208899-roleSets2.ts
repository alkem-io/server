import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleSets1736446208899 implements MigrationInterface {
  name = 'RoleSets1736446208899';

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

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_809c1e6cf3ef6be03a0a1db3f70\``
    );

    // Assign all current role sets the type of 'space'
    await queryRunner.query(`UPDATE \`role_set\` SET \`type\` = 'space'`);

    // Rename the type column on role to be name
    await queryRunner.query(
      `ALTER TABLE \`role\` CHANGE COLUMN \`type\` \`name\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` CHANGE COLUMN \`entryRoleType\` \`entryRoleName\` varchar(128) NOT NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `role` MODIFY COLUMN `credential` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `role` MODIFY COLUMN `parentCredentials` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `role` MODIFY COLUMN `userPolicy` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `role` MODIFY COLUMN `organizationPolicy` json null'
    );
    await queryRunner.query(
      'ALTER TABLE `role` MODIFY COLUMN `virtualContributorPolicy` json null'
    );

    // Create the role set for the platform
    const platformRoleSetID = await this.createRoleSet(
      queryRunner,
      'global-registered',
      'platform',
      platformRoles
    );
    // set the role set for the platform
    await queryRunner.query(
      `UPDATE \`platform\` SET \`roleSetId\` = '${platformRoleSetID}'`
    );

    // Update all the platform invitations to point to the new Platform RoleSet

    const platformInvitations: {
      id: string;
      platformRole: string;
    }[] = await queryRunner.query(
      `SELECT id, platformRole FROM \`platform_invitation\` WHERE \`platformId\` IS NOT NULL`
    );
    for (const platformInvitation of platformInvitations) {
      await queryRunner.query(
        `UPDATE \`platform_invitation\` SET \`roleSetId\` = '${platformRoleSetID}' WHERE id = '${platformInvitation.id}'`
      );
      await queryRunner.query(
        `UPDATE \`platform_invitation\` SET \`roleSetExtraRole\` = '${platformInvitation.platformRole}' WHERE id = '${platformInvitation.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP COLUMN \`platformId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP COLUMN \`platformRole\``
    );

    const organizations: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM \`organization\``);
    for (const organization of organizations) {
      // Create the role set for the organization
      for (const role of organizationRoles) {
        role.credentialData.resourceID = organization.id;
      }
      const organizationRoleSetID = await this.createRoleSet(
        queryRunner,
        'associate',
        'organization',
        organizationRoles
      );
      // set the role set for the organization
      await queryRunner.query(
        `UPDATE \`organization\` SET \`roleSetId\` = '${organizationRoleSetID}' WHERE id = '${organization.id}'`
      );
    }

    // Finally update all existing authorization policies that have the old privilege names
    await this.updatePrivilegeNames(queryRunner, 'credentialRules');
    await this.updatePrivilegeNames(queryRunner, 'privilegeRules');
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

  private async updatePrivilegeNames(
    queryRunner: QueryRunner,
    columnName: string
  ) {
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-add-member-vc-from-account', 'community-assign-vc-from-account')`
    );
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-join', 'roleset-entry-role-join')`
    );
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-apply', 'roleset-entry-role-apply')`
    );
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-invite', 'roleset-entry-role-invite')`
    );
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-invite-accept', 'roleset-entry-role-invite-accept')`
    );
    await queryRunner.query(
      `UPDATE \`authorization_policy\` SET \`${columnName}\` = REPLACE(\`${columnName}\`, 'community-add-member', 'roleset-entry-role-assign')`
    );
  }

  private async createRoleSet(
    queryRunner: QueryRunner,
    entryRole: string,
    roleSetType: string,
    roles: CreateRoleInput[]
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

    const applicationFormID = await this.createApplicationForm(queryRunner);

    await queryRunner.query(
      `INSERT INTO role_set (id,
                                version,
                                authorizationId,
                                entryRoleName,
                                licenseId,
                                applicationFormId,
                                type) VALUES
                        (
                        '${roleSetID}',
                        1,
                        '${roleSetAuthID}',
                        '${entryRole}',
                        '${licenseID}',
                        '${applicationFormID}',
                        '${roleSetType}')`
    );

    // Add in the roles
    for (const role of roles) {
      const roleID = randomUUID();
      await queryRunner.query(
        `INSERT INTO role (id,
                          version,
                          roleSetId,
                          name,
                          credential,
                          parentCredentials,
                          requiresEntryRole,
                          requiresSameRoleInParentRoleSet,
                          userPolicy,
                          organizationPolicy,
                          virtualContributorPolicy) VALUES
                        (
                        '${roleID}',
                        1,
                        '${roleSetID}',
                        '${role.name}',
                        '${JSON.stringify(role.credentialData)}',
                        '${JSON.stringify(role.parentCredentialsData)}',
                        ${role.requiresEntryRole},
                        ${role.requiresSameRoleInParentRoleSet},
                        '${JSON.stringify(role.userPolicyData)}',
                        '${JSON.stringify(role.organizationPolicyData)}',
                        '${JSON.stringify(role.virtualContributorPolicyData)}')`
      );
    }
    return roleSetID;
  }

  private async createApplicationForm(
    queryRunner: QueryRunner
  ): Promise<string> {
    const applicationFormID = randomUUID();

    await queryRunner.query(
      `INSERT INTO form (id,
                        version,
                        questions,
                        description) VALUES
                        (
                        '${applicationFormID}',
                        1,
                        '${JSON.stringify(applicationForm.questions)}',
                        '${applicationForm.description}')`
    );

    return applicationFormID;
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
                                version,
                                licenseId,
                                type,
                                dataType,
                                \`limit\`,
                                enabled) VALUES
                        (
                        '${randomUUID()}',
                        1,
                        '${licenseID}',
                        '${entitlement.type}',
                        '${entitlement.dataType}',
                        '${entitlement.limit}',
                        ${entitlement.enabled})`
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
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
                        ('${authID}',
                        1, '[]', '[]', '[]', '${policyType}')`
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

enum RoleName {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
  ASSOCIATE = 'associate',
  OWNER = 'owner',
  GLOBAL_ADMIN = 'global-admin',
  GLOBAL_SUPPORT = 'global-support', // Platform management; can be allowed to act as a SpaceAdmin depending on Space settings
  GLOBAL_LICENSE_MANAGER = 'global-license-manager',
  GLOBAL_COMMUNITY_READER = 'global-community-reader',
  GLOBAL_SPACES_READER = 'global-spaces-reader',
  PLATFORM_BETA_TESTER = 'platform-beta-tester',
  PLATFORM_VC_CAMPAIGN = 'platform-vc-campaign',
}

enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_SUPPORT = 'global-support', // able to manage platform level information, can per space have admin rights
  GLOBAL_LICENSE_MANAGER = 'global-license-manager', // able to manage platform level information, can per space have admin rights
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
  GLOBAL_COMMUNITY_READ = 'global-community-read', // able to view all details of the top level community
  GLOBAL_SPACES_READER = 'global-spaces-read', // able to view all details of the top level community

  USER_SELF_MANAGEMENT = 'user-self', // able to update a user

  SPACE_ADMIN = 'space-admin',
  SPACE_MEMBER = 'space-member',
  SPACE_LEAD = 'space-lead',
  SPACE_SUBSPACE_ADMIN = 'space-subspace-admin', // assigned to admins of a subspace for a space

  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_ASSOCIATE = 'organization-associate', // Able to be a part of an organization

  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group

  // Roles to allow easier management of users
  BETA_TESTER = 'beta-tester',
  VC_CAMPAIGN = 'vc-campaign',
}

type ICredentialDefinition = {
  type: string;
  resourceID: string;
};

type IContributorRolePolicy = {
  minimum: number;
  maximum: number;
};

type CreateRoleInput = {
  name: RoleName;
  requiresEntryRole: boolean;
  requiresSameRoleInParentRoleSet: boolean;
  credentialData: ICredentialDefinition;
  parentCredentialsData: ICredentialDefinition[];
  userPolicyData: IContributorRolePolicy;
  organizationPolicyData: IContributorRolePolicy;
  virtualContributorPolicyData: IContributorRolePolicy;
};

const organizationRoles: CreateRoleInput[] = [
  {
    name: RoleName.ASSOCIATE,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false, // not required
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.ADMIN,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: 3,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.OWNER,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 1,
      maximum: 3,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
];

const platformRoles: CreateRoleInput[] = [
  {
    name: RoleName.GLOBAL_ADMIN,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false, // not required
    credentialData: {
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 1, // Important: always one
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.GLOBAL_SUPPORT,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.GLOBAL_SUPPORT,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.GLOBAL_LICENSE_MANAGER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.GLOBAL_SPACES_READER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.GLOBAL_SPACES_READER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.PLATFORM_BETA_TESTER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.BETA_TESTER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.PLATFORM_VC_CAMPAIGN,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.VC_CAMPAIGN,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
  {
    name: RoleName.GLOBAL_COMMUNITY_READER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.GLOBAL_COMMUNITY_READ,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
];

const applicationForm = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
  ],
};
