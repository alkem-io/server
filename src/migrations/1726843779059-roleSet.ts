import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class RoleSet1726843779059 implements MigrationInterface {
  name = 'RoleSet1726843779059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_b3d3f3c2ce851d1059c4ed26ba2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_500cee6f635849f50e19c7e2b76\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_339c1fe2a9c5caef5b982303fb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3823de95920943655430125fa93\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_c7d74dd6b92d4202c705cd36769\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3823de95920943655430125fa9\` ON \`community\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\``
    );
    await queryRunner.query(
      `CREATE TABLE \`role\` (\`id\` char(36) NOT NULL,
                          \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                          \`version\` int NOT NULL,
                          \`type\` varchar(128) NOT NULL,
                          \`credential\` text NOT NULL, \`parentCredentials\` text NOT NULL,
                          \`requiresEntryRole\` tinyint NOT NULL,
                          \`requiresSameRoleInParentRoleSet\` tinyint NOT NULL,
                          \`userPolicy\` text NOT NULL,
                          \`organizationPolicy\` text NOT NULL,
                          \`virtualContributorPolicy\` text NOT NULL,
                          \`roleSetId\` char(36) NULL,
                          PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`role_set\` (\`id\` char(36) NOT NULL,
                          \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                          \`version\` int NOT NULL,
                          \`authorizationId\` char(36) NULL,
                          \`applicationFormId\` char(36) NULL,
                          \`parentRoleSetId\` char(36) NULL,
                          \`entryRoleType\` varchar(128) NOT NULL,
                          UNIQUE INDEX \`REL_b038f74c8d4eadb839e78b99ce\` (\`authorizationId\`),
                          UNIQUE INDEX \`REL_00905b142498f63e76d38fb254\` (\`applicationFormId\`),
                          PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_3b8f390d76263ef5996869da07\` (\`roleSetId\`)`
    );

    // Migrate the data! First loop ensures all are setup.
    const communities: {
      id: string;
      policyId: string;
      applicationFormId: string;
      parentCommunityId: string;
    }[] = await queryRunner.query(
      `SELECT id, policyId, applicationFormId, parentCommunityId FROM \`community\``
    );
    for (const community of communities) {
      const [policy]: {
        id: string;
        member: string;
        lead: string;
        admin: string;
      }[] = await queryRunner.query(
        `SELECT id, community_policy.member, community_policy.lead, community_policy.admin FROM community_policy WHERE id = '${community.policyId}'`
      );
      if (!policy) {
        throw Error(`No policy found for community: ${community.id}`);
      }
      const roleSetID = randomUUID();
      const roleSetAuthID = await createAuthorizationPolicy(
        queryRunner,
        'role-set'
      );
      let memberRequiresParentRole = true;
      if (!community.parentCommunityId) {
        memberRequiresParentRole = false;
      }

      await this.createRole(
        queryRunner,
        'member',
        policy.member,
        roleSetID,
        0,
        9,
        false,
        memberRequiresParentRole
      );
      await this.createRole(
        queryRunner,
        'lead',
        policy.lead,
        roleSetID,
        0,
        0,
        true,
        false
      );
      await this.createRole(
        queryRunner,
        'admin',
        policy.member,
        roleSetID,
        0,
        0,
        true,
        false
      );

      await queryRunner.query(
        `INSERT INTO role_set (id, version, authorizationId, applicationFormId, entryRoleType) VALUES ('${roleSetID}', 1, '${roleSetAuthID}', '${community.applicationFormId}', 'member')`
      );

      await queryRunner.query(
        `UPDATE community SET roleSetId = '${roleSetID}' WHERE id = '${community.id}'`
      );
    }

    // Second loop makes the hierarchy linked
    const communitiesWithRoleSets: {
      id: string;
      roleSetId: string;
      parentCommunityId: string;
    }[] = await queryRunner.query(
      `SELECT id, roleSetId, parentCommunityId FROM \`community\``
    );
    for (const community of communitiesWithRoleSets) {
      if (!community.parentCommunityId) {
        continue;
      }
      const [parentCommunity]: {
        id: string;
        roleSetId: string;
      }[] = await queryRunner.query(
        `SELECT id, roleSetId FROM community WHERE id = '${community.parentCommunityId}'`
      );
      if (!parentCommunity) {
        throw Error(
          `Unable to find parent community for community: ${community.id}`
        );
      }
      await queryRunner.query(
        `UPDATE role_set SET parentRoleSetId = '${parentCommunity.roleSetId}' WHERE id = '${community.roleSetId}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` CHANGE \`communityId\` \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `UPDATE platform_invitation SET roleSetId = (SELECT roleSetId FROM community WHERE id = platform_invitation.roleSetId)`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE \`communityId\` \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `UPDATE application SET roleSetId = (SELECT roleSetId FROM community WHERE id = application.roleSetId)`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` CHANGE \`communityId\` \`roleSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `UPDATE invitation SET roleSetId = (SELECT roleSetId FROM community WHERE id = invitation.roleSetId)`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`applicationFormId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`policyId\``
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3b8f390d76263ef5996869da07\` ON \`community\` (\`roleSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` ADD CONSTRAINT \`FK_66d695b73839e9b66ff1350d34f\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_562dce4a08bb214f08107b3631e\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_8fb220ad1ac1f9c86ec39d134e4\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_6a3b86c6db10582baae7058f5b9\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_b038f74c8d4eadb839e78b99ce5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_00905b142498f63e76d38fb254e\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` ADD CONSTRAINT \`FK_86acc254af20d20c9d87c3503d5\` FOREIGN KEY (\`parentRoleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3b8f390d76263ef5996869da071\` FOREIGN KEY (\`roleSetId\`) REFERENCES \`role_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3b8f390d76263ef5996869da07\` ON \`community\``
    );

    await queryRunner.query(`DROP TABLE \`community_policy\``);

    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_8e8283bdacc9e770918fe689333\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`parentCommunityId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_3b8f390d76263ef5996869da071\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_86acc254af20d20c9d87c3503d5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_00905b142498f63e76d38fb254e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role_set\` DROP FOREIGN KEY \`FK_b038f74c8d4eadb839e78b99ce5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` DROP FOREIGN KEY \`FK_6a3b86c6db10582baae7058f5b9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP FOREIGN KEY \`FK_8fb220ad1ac1f9c86ec39d134e4\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` DROP FOREIGN KEY \`FK_562dce4a08bb214f08107b3631e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` DROP FOREIGN KEY \`FK_66d695b73839e9b66ff1350d34f\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3b8f390d76263ef5996869da07\` ON \`community\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_3b8f390d76263ef5996869da07\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`roleSetId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policyId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`applicationFormId\` char(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_00905b142498f63e76d38fb254\` ON \`role_set\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_b038f74c8d4eadb839e78b99ce\` ON \`role_set\``
    );
    await queryRunner.query(`DROP TABLE \`role_set\``);
    await queryRunner.query(`DROP TABLE \`role\``);
    await queryRunner.query(
      `ALTER TABLE \`invitation\` CHANGE \`roleSetId\` \`communityId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` CHANGE \`roleSetId\` \`communityId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` CHANGE \`roleSetId\` \`communityId\` char(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c7d74dd6b92d4202c705cd3676\` ON \`community\` (\`applicationFormId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3823de95920943655430125fa9\` ON \`community\` (\`policyId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_c7d74dd6b92d4202c705cd36769\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_3823de95920943655430125fa93\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_339c1fe2a9c5caef5b982303fb0\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD CONSTRAINT \`FK_500cee6f635849f50e19c7e2b76\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_invitation\` ADD CONSTRAINT \`FK_b3d3f3c2ce851d1059c4ed26ba2\` FOREIGN KEY (\`communityId\`) REFERENCES \`community\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  private async createRole(
    queryRunner: QueryRunner,
    type: string,
    communityPolicyStr: string,
    roleSetID: string,
    vcMin: number,
    vcMax: number,
    requiresEntryRole: boolean,
    requiresSameRoleInParentRoleSet: boolean
  ) {
    const roleID = randomUUID();
    const communityRolePolicy: CommunityPolicy = JSON.parse(communityPolicyStr);
    const userPolicy = {
      minimum: communityRolePolicy.minUser,
      maximum: communityRolePolicy.maxUser,
    };
    const organizationPolicy = {
      minimum: communityRolePolicy.minOrg,
      maximum: communityRolePolicy.maxOrg,
    };
    const vcPolicy = {
      minimum: vcMin,
      maximum: vcMax,
    };

    // Create the role for the member role
    await queryRunner.query(`
        INSERT INTO role (id, version, type, credential, parentCredentials, requiresEntryRole, requiresSameRoleInParentRoleSet, userPolicy, organizationPolicy, virtualContributorPolicy, roleSetId) VALUES
                  ('${roleID}', 1,
                        '${type}',
                        '${JSON.stringify(communityRolePolicy.credential)}',
                        '${JSON.stringify(communityRolePolicy.parentCredentials)}',
                        ${requiresEntryRole},
                        ${requiresSameRoleInParentRoleSet},
                        '${JSON.stringify(userPolicy)}',
                        '${JSON.stringify(organizationPolicy)}',
                        '${JSON.stringify(vcPolicy)}',
                        '${roleSetID}')`);
  }
}

const createAuthorizationPolicy = async (
  queryRunner: QueryRunner,
  policyType: string
) => {
  const authID = randomUUID();
  await queryRunner.query(
    `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${authID}',
          1, '', '', 0, '', '${policyType}')`
  );
  return authID;
};

export type CredentialDefinition = {
  type: string;
  resourceID: string;
};
export type CommunityPolicy = {
  credential: CredentialDefinition;
  parentCredentials: CredentialDefinition[];
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
  enabled: boolean;
};
