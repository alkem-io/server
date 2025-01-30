import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountAdminCred1738233557873 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create an account admin credential for every user
    const users: {
      id: string;
      accountID: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, accountID, agentId FROM \`user\``
    );
    for (const user of users) {
      const credentialID = randomUUID();
      await queryRunner.query(`INSERT INTO credential (
                                id,
                                version,
                                type,
                                resourceID,
                                agentId) VALUES
                        (
                        '${credentialID}',
                        1,
                        'account-admin',
                        '${user.accountID}',
                        '${user.agentId}')`);
    }

    const organizations: {
      id: string;
      accountID: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, accountID, agentId FROM \`organization\``
    );
    for (const organization of organizations) {
      // Find all agents that have a owner or admin credential for this organization
      const agents: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT agentId as id FROM credential WHERE resourceID = '${organization.id}' AND type IN ('organization-owner', 'organization-admin')`
      );
      // For each such agent assign an account admin credential
      for (const agent of agents) {
        if (!agent.id) continue;

        const credentialID = randomUUID();
        await queryRunner.query(`INSERT INTO credential (
                                id,
                                version,
                                type,
                                resourceID,
                                agentId) VALUES
                        (
                        '${credentialID}',
                        1,
                        'account-admin',
                        '${organization.accountID}',
                        '${agent.id}')`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
