import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixKnowledgeBaseCalloutSetType1740486245080
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE callouts_set
      SET type = 'knowledge-base'
      WHERE id IN (
        SELECT DISTINCT calloutsSetId FROM knowledge_base
      )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration needed');
  }
}
