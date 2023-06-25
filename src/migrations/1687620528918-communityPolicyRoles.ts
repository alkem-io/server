import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';
import { randomUUID } from 'crypto';

export class communityPolicyRoles1687620528918 implements MigrationInterface {
  name = 'communityPolicyRoles1687620528918';

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

      // Update for leads
      const oldLeadRolePolicy: oldCommunityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      const newLeadRolePolicy: newCommunityRolePolicy = {
        enabled: true,
        ...oldLeadRolePolicy,
      };

      // Update for Admins
      const adminRolePolicyStr = communityPolicy.member.replace(
        'member',
        'admin'
      );
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

      await queryRunner.query(
        `UPDATE community_policy SET member = '${escapeString(
          JSON.stringify(newMemberRolePolicy)
        )}',
                                       lead = '${escapeString(
                                         JSON.stringify(newLeadRolePolicy)
                                       )}',
                                       admin = '${escapeString(
                                         JSON.stringify(newAdminRolePolicy)
                                       )}',
                                       host = '${escapeString(
                                         JSON.stringify(newHostRolePolicy)
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
        `INSERT INTO credential (id, resourceID, type, agentId)
            VALUES ('${credID}',
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

      // Update for leads
      const oldLeadRolePolicy: newCommunityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      const newLeadRolePolicy: oldCommunityRolePolicy = {
        ...oldLeadRolePolicy,
      };

      await queryRunner.query(
        `UPDATE community_policy SET member = '${escapeString(
          JSON.stringify(newMemberRolePolicy)
        )}',
                                     lead = '${escapeString(
                                       JSON.stringify(newLeadRolePolicy)
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
