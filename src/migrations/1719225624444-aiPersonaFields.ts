import { MigrationInterface, QueryRunner } from 'typeorm';

export class aiPersonaFields1719225624444 implements MigrationInterface {
  name = 'aiPersonaFields1719225624444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   `ALTER TABLE \`ai_persona\` ADD \`bodyOfKnowledge\` text DEFAULT  NULL`
    // );

    const aiPersonas: {
      id: string;
      aiPersonaServiceID: string;
    }[] = await queryRunner.query(
      `SELECT id, aiPersonaServiceID FROM ai_persona`
    );
    for (const aiPersona of aiPersonas) {
      const [aiPersonaService]: {
        id: string;
        bodyOfKnowledgeType: string;
        bodyOfKnowledgeID: string;
      }[] = await queryRunner.query(
        `SELECT id, bodyOfKnowledgeType, bodyOfKnowledgeID FROM ai_persona_service where id = '${aiPersona.aiPersonaServiceID}'`
      );
      const bodyOfKnowledge = `Body of knowledge:  based on the AI persona service ID: ${aiPersona.aiPersonaServiceID}`;
      await queryRunner.query(
        `UPDATE ai_persona SET bodyOfKnowledge = '${bodyOfKnowledge}' WHERE id = '${aiPersona.id}'`
      );
    }

    throw new Error(`migration completed successfully `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
