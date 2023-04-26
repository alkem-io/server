import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutsKnowledgeGroup1682487402535 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE callout SET \`group\` = 'KNOWLEDGE' WHERE (\`group\` = '' OR \`group\` IS NULL)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE callout SET \`group\` = NULL WHERE \`group\` = 'KNOWLEDGE'`
    );
  }
}
