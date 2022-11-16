import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

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
      `ALTER TABLE \`community\` ADD \`policyId\` varchar(36) NOT NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policy FROM community`
    );
    for (const community of communities) {
      const policyStr = community.policy;
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
        `UPDATE community SET policyId = '${communityPolicyID}' WHERE (id = '${community.id}')`
      );
    }

    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `policy`');

    // Now set the parent credentials
    const communitiesNewPolicy: any[] = await queryRunner.query(
      `SELECT id, policyId, parentCommunityId FROM community`
    );
    for (const community of communitiesNewPolicy) {
      const parentCommunityId = community.parentCommunityId;
      if (parentCommunityId) {
        console.log(
          `===> Updating parent credentials for community with id: ${community.id}`
        );
        // Need to get the parents
        const parentMemberCredentials: any[] = [];
        const parentLeadCredentials: any[] = [];
        await this.getCredentialsForCommunity(
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
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON UPDATE NO ACTION`
    );
  }

  private async getCredentialsForCommunity(
    communityID: string,
    queryRunner: QueryRunner,
    parentMemberCredentials: any[],
    parentLeadCredentials: any[]
  ): Promise<void> {
    const communityResult = await queryRunner.query(
      `SELECT id, policyId, parentCommunityId  FROM community  WHERE (id = '${communityID}')`
    );
    const community = communityResult[0];
    const communityPolicyResult = await queryRunner.query(
      `SELECT id, member, lead  FROM community_policy  WHERE (id = '${community.policyId}')`
    );
    const communityPolicy = communityPolicyResult[0];
    const memberPolicy = JSON.parse(
      communityPolicy.member
    ) as newCommunityRolePolicy;
    const leadPolicy = JSON.parse(
      communityPolicy.lead
    ) as newCommunityRolePolicy;
    parentMemberCredentials.push(memberPolicy.credential);
    parentLeadCredentials.push(leadPolicy.credential);
    if (community.parentCommunityId) {
      return await this.getCredentialsForCommunity(
        community.parentCommunityId,
        queryRunner,
        parentMemberCredentials,
        parentLeadCredentials
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policyId FROM community`
    );
    for (const community of communities) {
      const communityPolicies = await queryRunner.query(
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
