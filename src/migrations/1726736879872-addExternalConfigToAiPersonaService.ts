import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalConfigToAiPersonaService1726736879872
  implements MigrationInterface
{
  name = 'AddExternalConfigToAiPersonaService1726736879872';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD \`externalConfig\` text NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP COLUMN \`externalConfig\``
    );
  }
}
