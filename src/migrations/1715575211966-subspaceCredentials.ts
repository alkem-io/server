import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaceCredentials1715575211966 implements MigrationInterface {
  name = 'subspaceCredentials1715575211966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // All credentials need to be updated to reflect the new type
    const credentials: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM credential`);
    for (const credential of credentials) {
      // Update the type
      const updatedType = this.updateCredentialType(credential.type);
      await queryRunner.query(
        `UPDATE credential SET type = '${updatedType}' WHERE id = '${credential.id}'`
      );
    }

    // And the community policies
    const communityPolicies: {
      id: string;
      member: string;
      lead: string;
      admin: string;
    }[] = await queryRunner.query(
      `SELECT id, community_policy.member, community_policy.lead, community_policy.admin FROM community_policy`
    );
    for (const policy of communityPolicies) {
      // Update the member
      const updatedMember = this.updateCredentialType(policy.member);
      await queryRunner.query(
        `UPDATE community_policy SET community_policy.member = '${updatedMember}' WHERE id = '${policy.id}'`
      );

      // Update the lead
      const updatedLead = this.updateCredentialType(policy.lead);
      await queryRunner.query(
        `UPDATE community_policy SET community_policy.lead = '${updatedLead}' WHERE id = '${policy.id}'`
      );

      // Update the admin
      const updatedAdmin = this.updateCredentialType(policy.admin);
      await queryRunner.query(
        `UPDATE community_policy SET community_policy.admin = '${updatedAdmin}' WHERE id = '${policy.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private updateCredentialType(type: string): string {
    let result = type;
    result = result.replace('subspace-', 'space-');
    return result;
  }
}
