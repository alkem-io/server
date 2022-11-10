import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class communityPolicy1668109973567 implements MigrationInterface {
  name = 'communityPolicy1668109973567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Library
    await queryRunner.query(
      `CREATE TABLE \`community_policy\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
             \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              \`version\` int NOT NULL, \`member\` text NULL, \`lead\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`policyId\` char(36) NOT NULL`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policy FROM community`
    );
    for (const community of communities) {
      const policyStr = community.policy;
      const policy: oldCommunityPolicy = JSON.parse(policyStr);
      const memberStr = JSON.stringify(policy.member);
      const leadStr = JSON.stringify(policy.lead);
      const communityPolicyID = randomUUID();
      await queryRunner.query(
        `INSERT INTO community_policy (id, createdDate, updatedDate, version, member, lead) VALUES ('${communityPolicyID}', NOW(), NOW(), 1, '${memberStr}', '${leadStr}')`
      );
      await queryRunner.query(
        `UPDATE community SET policyId = '${communityPolicyID}' WHERE (id = '${community.id}')`
      );
    }

    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `policy`');

    // Todo:
    // await queryRunner.query(
    //   `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   `ALTER TABLE \`community\` ADD \`policy\` text NULL`
    // );

    const communities: any[] = await queryRunner.query(
      `SELECT id, policyId FROM community`
    );
    for (const community of communities) {
      const communityPolicies = await queryRunner.query(
        `SELECT id, member, lead FROM community_policy WHERE (id = '${community.policyId}')`
      );
      const communityPolicy = communityPolicies[0];
      const revertedPolicy: oldCommunityPolicy = {
        member: communityPolicy.member,
        lead: communityPolicy.lead,
      };
      const revertedPolicyStr = JSON.stringify(revertedPolicy);

      await queryRunner.query(
        `UPDATE community SET policy = '${revertedPolicyStr}' WHERE (id = '${community.id}')`
      );
    }

    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `policyId`');
    await queryRunner.query('DROP TABLE `community_policy`');
  }
}

type oldCommunityPolicy = {
  member: any;
  lead: any;
};
