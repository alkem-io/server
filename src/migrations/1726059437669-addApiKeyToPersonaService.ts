import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyToPersonaService1726059437669
  implements MigrationInterface
{
  name = 'AddApiKeyToPersonaService1726059437669';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD \`apiKey\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` DROP COLUMN \`apiKey\``
    );
  }
}
