import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class SpaceL0Host1744022375257 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const organizations: {
      id: string;
      accountID: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, accountID, agentId FROM \`organization\``
    );
    for (const organization of organizations) {
      const orgSpaces: {
        id: string;
        agentId: string;
      }[] = await queryRunner.query(
        `SELECT id, agentId FROM \`space\` WHERE accountId = ? AND level = 0`,
        [organization.accountID]
      );
      for (const space of orgSpaces) {
        // Create and add the credential to the space agent
        await this.createCredential(
          queryRunner,
          'space-member',
          space.id,
          organization.agentId
        );
        await this.createCredential(
          queryRunner,
          'space-lead',
          space.id,
          organization.agentId
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createCredential(
    queryRunner: QueryRunner,
    credentialType: string,
    credentialResourceID: string,
    agentID: string
  ): Promise<string> {
    const credentialID = randomUUID();
    await queryRunner.query(
      `INSERT INTO credential (id, version, resourceID, type, agentId) VALUES
                              (
                            '${credentialID}',
                              1,
                              '${credentialResourceID}',
                              '${credentialType}',
                              '${agentID}')`
    );
    return credentialID;
  }
}
