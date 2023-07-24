import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class fixLeadPolicies1690199038577 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const communityPolicies: {
      id: string;
      lead: string;
    }[] = await queryRunner.query(`SELECT id, lead FROM community_policy`);
    for (const communityPolicy of communityPolicies) {
      // Update for leads
      const oldLeadRolePolicy: communityRolePolicy = JSON.parse(
        communityPolicy.lead
      );
      const newLeadRolePolicy: communityRolePolicy = {
        ...oldLeadRolePolicy,
        credential: {
          type: oldLeadRolePolicy.credential.type.replace('host', 'lead'),
          resourceID: oldLeadRolePolicy.credential.resourceID,
        },
      };
      const newLeadPolicyStr = JSON.stringify(newLeadRolePolicy);

      await queryRunner.query(
        `UPDATE community_policy SET
                                         lead = '${escapeString(
                                           newLeadPolicyStr
                                         )}' WHERE id = '${communityPolicy.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Migration 'fixLeadPolicies1690199038577' is not revertible. Please make sure you have a backup of your data before running this migration."
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
