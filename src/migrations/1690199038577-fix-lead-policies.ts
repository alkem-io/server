import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

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
          type: AuthorizationCredential.SPACE_LEAD,
          resourceID: '',
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

  public async down(queryRunner: QueryRunner): Promise<void> {}
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
