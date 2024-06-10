import { MigrationInterface, QueryRunner } from 'typeorm';

export class communitPolicyParentCred1716805934325
  implements MigrationInterface
{
  name = 'communitPolicyParentCred1716805934325';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the agent on each account
    const communityPolicies: {
      id: string;
      lead: string;
    }[] = await queryRunner.query(
      `SELECT \`id\`, \`lead\` FROM \`community_policy\``
    );
    for (const policy of communityPolicies) {
      const policyLead: CommunityPolicyRole = JSON.parse(policy.lead);
      const newParentCredentials: CredentialDefinition[] = [];
      for (const parentCredential of policyLead.parentCredentials) {
        if (parentCredential.type === 'account-host') {
          const [space]: { id: string }[] = await queryRunner.query(
            `SELECT id FROM space where id = '${parentCredential.resourceID}'`
          );
          if (space) {
            parentCredential.type = 'space-lead';
            newParentCredentials.push(parentCredential);
            policyLead.parentCredentials = newParentCredentials;

            await queryRunner.query(
              `UPDATE \`community_policy\` SET \`lead\` = '${JSON.stringify(
                policyLead
              )}' WHERE id = '${policy.id}'`
            );
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'No down migration possible for communitPolicyParentCred1716805934325 migration!'
    );
  }
}

export type CredentialDefinition = {
  type: string;
  resourceID: string;
};

export type CommunityPolicyRole = {
  enabled: boolean;

  credential: CredentialDefinition;

  parentCredentials: CredentialDefinition[];

  minUser: number;

  maxUser: number;

  minOrg: number;

  maxOrg: number;
};
