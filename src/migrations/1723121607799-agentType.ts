import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentType1723121607799 implements MigrationInterface {
  name = 'AgentType1723121607799';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the agent table
    await queryRunner.query('ALTER TABLE `agent` ADD `type` varchar(128) NULL');
    await this.updateAgentTypeForEntity(queryRunner, 'account', 'account');
    await this.updateAgentTypeForEntity(queryRunner, 'space', 'space');
    await this.updateAgentTypeForEntity(queryRunner, 'user', 'user');
    await this.updateAgentTypeForEntity(
      queryRunner,
      'organization',
      'organization'
    );
    await this.updateAgentTypeForEntity(
      queryRunner,
      'virtual_contributor',
      'virtual-contributor'
    );

    // Drop the parentDisplayID column from the agent table
    await queryRunner.query(
      'ALTER TABLE `agent` DROP COLUMN `parentDisplayID`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateAgentTypeForEntity(
    queryRunner: QueryRunner,
    entityType: string,
    agentType: string
  ) {
    const entities: {
      id: string;
      agentId: string;
    }[] = await queryRunner.query(`SELECT id, agentId FROM \`${entityType}\``);
    for (const entity of entities) {
      const [agent]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM agent WHERE id = '${entity.agentId}'`
      );
      if (agent) {
        await queryRunner.query(
          `UPDATE \`agent\` SET type = '${agentType}' WHERE id = '${agent.id}'`
        );
      } else {
        console.log(`No agent found for ${entityType}: ${entity.id}`);
      }
    }
  }
}
