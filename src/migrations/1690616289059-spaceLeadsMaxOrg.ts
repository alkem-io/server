import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class spaceLeadsMaxOrg1690616289059 implements MigrationInterface {
  name = 'spaceLeadsMaxOrg1690616289059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const spaces: {
      id: string;
      communityId: string;
    }[] = await queryRunner.query(`SELECT id, communityId FROM space`);
    for (const space of spaces) {
      const communities: {
        id: string;
        policyId: string;
      }[] = await queryRunner.query(
        `SELECT id, policyId FROM community WHERE (id = '${space.communityId}')`
      );
      if (communities.length !== 1) {
        console.warn(
          "Migration 'spaceLeadsMaxOrg1690616289059' found Space whose community could not be found."
        );
      }
      const community = communities[0];
      const communityPolicies: {
        id: string;
        lead: string;
      }[] = await queryRunner.query(
        `SELECT id, lead FROM community_policy WHERE (id = '${community.policyId}')`
      );
      if (communityPolicies.length !== 1) {
        console.warn(
          "Migration 'spaceLeadsMaxOrg1690616289059' found Community whose community policy could not be found."
        );
      }
      const communityPolicy = communityPolicies[0];
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
