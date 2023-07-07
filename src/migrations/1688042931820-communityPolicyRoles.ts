import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';
import { randomUUID } from 'crypto';

export class communityPolicyRoles1688042931820 implements MigrationInterface {
  name = 'communityPolicyRoles1688042931820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` ADD \`admin\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community_policy\` ADD \`host\` text NULL`
    );

    const communityPolicies: {
      id: string;
      member: string;
      lead: string;
      admin: string;
      host: string;
    }[] = await queryRunner.query(
      `SELECT id, member, lead, admin, host FROM community_policy`
    );
    for (const communityPolicy of communityPolicies) {
      // Update for members
      const oldMemberRolePolicy: oldCommunityRolePolicy = JSON.parse(
        communityPolicy.member
      );
      const newMemberRolePolicy: newCommunityRolePolicy = {
        enabled: true,
        ...oldMemberRolePolicy,
      };
      const newMemberPolicyStr = JSON.stringify(newMemberRolePolicy);

      // Update for leads
      const oldLeadRolePolicy: oldCommunityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      const newLeadRolePolicy: newCommunityRolePolicy = {
        enabled: true,
        ...oldLeadRolePolicy,
      };
      const newLeadPolicyStr = JSON.stringify(newLeadRolePolicy);

      // Update for Admins
      const memberPolicyStr = communityPolicy.member.toString();
      const adminRolePolicyStr = memberPolicyStr.replace('member', 'admin');
      const oldAdminRolePolicy: oldCommunityRolePolicy =
        JSON.parse(adminRolePolicyStr);
      oldAdminRolePolicy.minOrg = 0;
      oldAdminRolePolicy.maxOrg = 0;
      oldAdminRolePolicy.minUser = 0;
      oldAdminRolePolicy.maxUser = -1;
      const newAdminRolePolicy: newCommunityRolePolicy = {
        enabled: true,
        ...oldAdminRolePolicy,
      };
      const newAdminPolicyStr = JSON.stringify(newAdminRolePolicy);

      // Update for Hosts
      const hostRolePolicyStr = communityPolicy.lead.replace('lead', 'host');
      const oldHostRolePolicy: oldCommunityRolePolicy =
        JSON.parse(hostRolePolicyStr);
      const newHostRolePolicy: newCommunityRolePolicy = {
        enabled: false,
        ...oldHostRolePolicy,
      };
      newHostRolePolicy.minUser = 0; // Users cannot be hosts for now
      newHostRolePolicy.maxUser = 0; // Users cannot be hosts for now
      newHostRolePolicy.minOrg = 0; // Default to not enabled
      newHostRolePolicy.maxOrg = 0; // Default to not enabled
      if (newHostRolePolicy.credential.type === 'space-host') {
        newHostRolePolicy.minOrg = 1;
        newHostRolePolicy.maxOrg = 1;
        newHostRolePolicy.enabled = true;
      }
      const newHostRolePolicyStr = JSON.stringify(newHostRolePolicy);

      await queryRunner.query(
        `UPDATE community_policy SET
                                       member = '${escapeString(
                                         newMemberPolicyStr
                                       )}',
                                       lead = '${escapeString(
                                         newLeadPolicyStr
                                       )}',
                                       admin = '${escapeString(
                                         newAdminPolicyStr
                                       )}',
                                       host = '${escapeString(
                                         newHostRolePolicyStr
                                       )}' WHERE id = '${communityPolicy.id}'`
      );
    }

    // Assign host credential for all space hosts
    const spaceHostCreds: {
      id: string;
      resourceID: string;
      type: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type, agentId FROM credential WHERE type = 'space-host'`
    );
    for (const spaceHostCred of spaceHostCreds) {
      // Clone + assign a space-lead credential
      const credID = randomUUID();
      await queryRunner.query(
        `INSERT INTO credential (id, version resourceID, type, agentId)
            VALUES ('${credID}',
                    1,
                    '${spaceHostCred.resourceID}',
                    'space-lead',
                    '${spaceHostCred.agentId}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const communityPolicies: {
      id: string;
      member: string;
      lead: string;
      admin: string;
      host: string;
    }[] = await queryRunner.query(
      `SELECT id, member, lead  FROM community_policy`
    );
    for (const communityPolicy of communityPolicies) {
      // Update for members
      const oldMemberRolePolicy: newCommunityRolePolicy = JSON.parse(
        communityPolicy.member
      );
      const newMemberRolePolicy: oldCommunityRolePolicy = {
        ...oldMemberRolePolicy,
      };
      const newMemberRolePolicyStr = JSON.stringify(newMemberRolePolicy);

      // Update for leads
      const oldLeadRolePolicy: newCommunityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      const newLeadRolePolicy: oldCommunityRolePolicy = {
        ...oldLeadRolePolicy,
      };
      const newLeadRolePolicyStr = JSON.stringify(newLeadRolePolicy);

      await queryRunner.query(
        `UPDATE community_policy SET member = '${escapeString(
          newMemberRolePolicyStr
        )}',
                                     lead = '${escapeString(
                                       newLeadRolePolicyStr
                                     )}' WHERE id = '${communityPolicy.id}'`
      );
      await queryRunner.query(
        'ALTER TABLE `community_policy` DROP COLUMN `admin`'
      );
      await queryRunner.query(
        'ALTER TABLE `community_policy` DROP COLUMN `host`'
      );
    }

    // Assign host credential for all space hosts
    const spaceLeadCreds: {
      id: string;
      resourceID: string;
      type: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type, agentId FROM credential WHERE type = 'space-lead'`
    );
    for (const spaceLeadCred of spaceLeadCreds) {
      await queryRunner.query(
        `DELETE FROM credential WHERE  (id = '${spaceLeadCred.id}')`
      );
    }
  }
}

type oldCommunityRolePolicy = {
  credential: {
    type: string;
    resourceID: string;
  };
  parentCredentials: any[];
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};

type newCommunityRolePolicy = {
  enabled: boolean;
  credential: {
    type: string;
    resourceID: string;
  };
  parentCredentials: any[];
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};
