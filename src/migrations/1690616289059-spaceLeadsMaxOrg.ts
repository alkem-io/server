import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class spaceLeadsMaxOrg1690616289059 implements MigrationInterface {
  name = 'spaceLeadsMaxOrg1690616289059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const communityPolicies: {
      id: string;
      lead: string;
    }[] = await queryRunner.query(`SELECT id, lead FROM community_policy`);
    for (const communityPolicy of communityPolicies) {
      // Update for leads
      const leadRolePolicy: communityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      leadRolePolicy.maxOrg = 2;

      const newLeadPolicyStr = JSON.stringify(leadRolePolicy);

      await queryRunner.query(
        `UPDATE community_policy SET
                                           lead = '${escapeString(
                                             newLeadPolicyStr
                                           )}' WHERE id = '${
          communityPolicy.id
        }'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Migration 'spaceLeadsMaxOrg1690616289059' is not revertible. Please make sure you have a backup of your data before running this migration."
    );
  }
}

type communityRolePolicy = {
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
