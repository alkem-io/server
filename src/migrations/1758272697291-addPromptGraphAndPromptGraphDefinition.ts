import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromptGraphAndPromptGraphDefinition1758272697291
  implements MigrationInterface
{
  name = 'AddPromptGraphAndPromptGraphDefinition1758272697291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`promptGraphDefinition\` json NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD \`promptGraph\` json NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP COLUMN \`promptGraph\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`promptGraphDefinition\``
    );
  }
}
