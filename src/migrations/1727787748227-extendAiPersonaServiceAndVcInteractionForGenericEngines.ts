import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendAiPersonaServiceAndVcInteractionForGenericEngines1727787748227
  implements MigrationInterface
{
  name = 'ExtendAiPersonaServiceAndVcInteractionForGenericEngines1727787748227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` ADD \`externalMetadata\` text NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD \`externalConfig\` text NULL`
    );

    await queryRunner.query(
      `UPDATE \`ai_persona_service\` SET \`prompt\` = IF(prompt = '', JSON_ARRAY(), JSON_ARRAY(prompt))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP COLUMN \`externalConfig\``
    );
    await queryRunner.query(
      `ALTER TABLE \`vc_interaction\` DROP COLUMN \`externalMetadata\``
    );
  }
}
