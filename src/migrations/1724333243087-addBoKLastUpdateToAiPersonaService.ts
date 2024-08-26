import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoKLastUpdateToAiPersonaService1724333243087
  implements MigrationInterface
{
  name = 'AddBoKLastUpdateToAiPersonaService1724333243087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD \`bodyOfKnowledgeLastUpdated\` datetime DEFAULT NULL`
    );

    await queryRunner.query(
      `UPDATE \`ai_persona_service\` SET \`bodyOfKnowledgeLastUpdated\`= NOW()`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP COLUMN \`bodyOfKnowledgeLastUpdated\``
    );
  }
}
