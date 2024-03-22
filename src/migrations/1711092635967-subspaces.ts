import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaces1711092635967 implements MigrationInterface {
  name = 'subspaces1711092635967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the type for all credentials
    const credentials: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM credential`);
    for (const credential of credentials) {
      await queryRunner.query(
        `UPDATE credential SET type = '${this.updateCredentialType(
          credential.type
        )}' WHERE id = '${credential.id}'`
      );
    }
    // Update all community policies
    const communityPolicies: {
      id: string;
      member: string;
      lead: string;
      admin: string;
    }[] = await queryRunner.query(
      `SELECT id, community_policy.member, community_policy.lead, admin FROM community_policy`
    );
    for (const policy of communityPolicies) {
      await queryRunner.query(
        `UPDATE community_policy SET member = '${this.updateCredentialType(
          policy.member
        )}' WHERE id = '${policy.id}'`
      );
      await queryRunner.query(
        `UPDATE community_policy SET community_policy.lead = '${this.updateCredentialType(
          policy.lead
        )}' WHERE id = '${policy.id}'`
      );
      await queryRunner.query(
        `UPDATE community_policy SET admin = '${this.updateCredentialType(
          policy.admin
        )}' WHERE id = '${policy.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`community_policy\` DROP COLUMN \`host\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private updateCredentialType(type: string): string {
    let result = type;
    result = result.replace('space-host', 'account-host');
    result = result.replace('challenge-', 'subspace-');
    result = result.replace('opportunity', 'subspace-');
    return result;
  }
}
