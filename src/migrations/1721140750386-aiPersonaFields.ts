import { MigrationInterface, QueryRunner } from 'typeorm';

export class aiPersonaFields1721140750386 implements MigrationInterface {
  name = 'aiPersonaFields1721140750386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const aiPersonaServices: {
      id: string;
      bodyOfKnowledgeType: string;
    }[] = await queryRunner.query(
      `SELECT id, bodyOfKnowledgeType FROM \`ai_persona_service\``
    );
    for (const aiPersonaService of aiPersonaServices) {
      if (aiPersonaService.bodyOfKnowledgeType === '') {
        await queryRunner.query(
          `UPDATE ai_persona_service SET bodyOfKnowledgeType = 'none' WHERE id = '${aiPersonaService.id}'`
        );
      } else if (aiPersonaService.bodyOfKnowledgeType === 'space') {
        await queryRunner.query(
          `UPDATE ai_persona_service SET bodyOfKnowledgeType = 'alkemio-space' WHERE id = '${aiPersonaService.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
