import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeBaseCalloutsSet1740482794998
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const knowledgeBases: {
      id: string;
      calloutsSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, calloutsSetId FROM \`knowledge_base\``
    );
    for (const knowledgeBase of knowledgeBases) {
      await queryRunner.query(
        `UPDATE \`callouts_set\` SET \`type\` = 'knowledge-base' WHERE id = '${knowledgeBase.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
