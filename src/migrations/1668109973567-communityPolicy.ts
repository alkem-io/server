import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuthorizationCredential } from './utils/duplicate/authorization.credential';

export class communityPolicy1668109973567 implements MigrationInterface {
  name = 'communityPolicy1668109973567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`community_policy\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`member\` text NULL, \`lead\` text NULL,
              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policyId\` varchar(36) NULL`
    );

    const communities: { id: string; policy: string; type: string }[] =
      await queryRunner.query(`SELECT id, policy, type FROM community`);
    for (const community of communities) {
      if (!community.policy && !community.type) {
        // we cant migrate non existing policy
        // and we cant set a default one, because the type does not exist
        continue;
      }

      const policyStr =
        community.policy ??
        communityPolicyToCommunityTypeMapping[community.type];
      const policy: oldCommunityPolicy = JSON.parse(policyStr);
      const newMemberPolicy: newCommunityRolePolicy = {
        ...policy.member,
        parentCredentials: [],
      };
      const newLeadPolicy: newCommunityRolePolicy = {
        ...policy.lead,
        parentCredentials: [],
      };
      const memberStr = JSON.stringify(newMemberPolicy);
      const leadStr = JSON.stringify(newLeadPolicy);
      const communityPolicyID = randomUUID();
      await queryRunner.query(
        `INSERT INTO community_policy (id, createdDate, updatedDate, version, member, lead) VALUES ('${communityPolicyID}', NOW(), NOW(), 1, '${memberStr}', '${leadStr}')`
      );
      await queryRunner.query(
        `UPDATE community SET policyId = '${communityPolicyID}' WHERE id = '${community.id}'`
      );
    }

    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `policy`');

    // Now set the parent credentials
    const communitiesNewPolicy: {
      id: string;
      policyId: string;
      parentCommunityId: string;
    }[] = await queryRunner.query(
      `SELECT id, policyId, parentCommunityId FROM community`
    );
    for (const community of communitiesNewPolicy) {
      const parentCommunityId = community.parentCommunityId;
      if (parentCommunityId) {
        // Need to get the parents
        const parentMemberCredentials: any[] = [];
        const parentLeadCredentials: any[] = [];
        await getCredentialsForCommunity(
          parentCommunityId,
          queryRunner,
          parentMemberCredentials,
          parentLeadCredentials
        );
        const communityPolicyResult = await queryRunner.query(
          `SELECT id, member, lead  FROM community_policy  WHERE (id = '${community.policyId}')`
        );
        const communityPolicy = communityPolicyResult[0];

        const memberPolicy: newCommunityRolePolicy = JSON.parse(
          communityPolicy.member
        );
        memberPolicy.parentCredentials = parentMemberCredentials;
        const memberStr = JSON.stringify(memberPolicy);

        const leadPolicy: newCommunityRolePolicy = JSON.parse(
          communityPolicy.lead
        );
        leadPolicy.parentCredentials = parentLeadCredentials;
        const leadStr = JSON.stringify(leadPolicy);

        await queryRunner.query(
          `UPDATE community_policy SET member = '${memberStr}', lead = '${leadStr}' WHERE (id = '${communityPolicy.id}')`
        );
      }
    }

    await queryRunner.query(
      'ALTER TABLE `community` ADD UNIQUE INDEX `IDX_c9ff67519d26140f98265a542e` (`policyId`)'
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policyId FROM community`
    );
    for (const community of communities) {
      const communityPolicies: { id: string; member: string; lead: string }[] =
        await queryRunner.query(
          `SELECT id, member, lead FROM community_policy WHERE (id = '${community.policyId}')`
        );
      const communityPolicy = communityPolicies[0];
      const { parentCredentials: memberParents, ...oldMemberRolePolicy } =
        JSON.parse(communityPolicy.member) as newCommunityRolePolicy;
      const { parentCredentials: leadParents, ...oldLeadRolePolicy } =
        JSON.parse(communityPolicy.lead) as newCommunityRolePolicy;
      const revertedPolicy: oldCommunityPolicy = {
        member: oldMemberRolePolicy,
        lead: oldLeadRolePolicy,
      };
      const revertedPolicyStr = JSON.stringify(revertedPolicy);

      await queryRunner.query(
        `UPDATE community SET policy = '${revertedPolicyStr}' WHERE (id = '${community.id}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP INDEX \`IDX_c9ff67519d26140f98265a542e\``
    );
    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `policyId`');
    await queryRunner.query('DROP TABLE `community_policy`');
  }
}

const getCredentialsForCommunity = async (
  communityID: string,
  queryRunner: QueryRunner,
  parentMemberCredentials: any[],
  parentLeadCredentials: any[]
): Promise<void> => {
  const communityResult: {
    id: string;
    policyId: string;
    parentCommunityId: string;
  }[] = await queryRunner.query(
    `SELECT id, policyId, parentCommunityId  FROM community  WHERE id = '${communityID}'`
  );
  const community = communityResult[0];
  const communityPolicyResult: { id: string; member: string; lead: string }[] =
    await queryRunner.query(
      `SELECT id, member, lead  FROM community_policy  WHERE id = '${community.policyId}'`
    );
  const communityPolicy = communityPolicyResult[0];
  const memberPolicy = JSON.parse(
    communityPolicy.member
  ) as newCommunityRolePolicy;
  const leadPolicy = JSON.parse(communityPolicy.lead) as newCommunityRolePolicy;
  parentMemberCredentials.push(memberPolicy.credential);
  parentLeadCredentials.push(leadPolicy.credential);
  if (community.parentCommunityId) {
    return getCredentialsForCommunity(
      community.parentCommunityId,
      queryRunner,
      parentMemberCredentials,
      parentLeadCredentials
    );
  }
};

type oldCommunityPolicy = {
  member: oldCommunityRolePolicy;
  lead: oldCommunityRolePolicy;
};

type newCommunityPolicy = {
  member: newCommunityRolePolicy;
  lead: newCommunityRolePolicy;
};

type oldCommunityRolePolicy = {
  credential: any;
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};

type newCommunityRolePolicy = {
  credential: any;
  parentCredentials: any[];
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};

const hxbCommunityPolicy: oldCommunityPolicy = {
  member: {
    credential: {
      type: AuthorizationCredential.HXB_MEMBER,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  lead: {
    credential: {
      type: AuthorizationCredential.HXB_HOST,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: 1,
    minUser: 0,
    maxUser: 2,
  },
};

const challengeCommunityPolicy: oldCommunityPolicy = {
  member: {
    credential: {
      type: AuthorizationCredential.CHALLENGE_MEMBER,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  lead: {
    credential: {
      type: AuthorizationCredential.CHALLENGE_LEAD,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  },
};

const opportunityCommunityPolicy: oldCommunityPolicy = {
  member: {
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_MEMBER,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  lead: {
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_LEAD,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  },
};

const communityPolicyToCommunityTypeMapping: Record<string, string> = {
  hxb: JSON.stringify(hxbCommunityPolicy),
  challenge: JSON.stringify(challengeCommunityPolicy),
  opportunity: JSON.stringify(opportunityCommunityPolicy),
};
