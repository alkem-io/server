import { MigrationInterface, QueryRunner } from 'typeorm';

export class revertVirtualPersonaPrompt1717058223813
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_persona');
    const isPromptColumnExist = table?.findColumnByName('prompt');

    if (!isPromptColumnExist) {
      await queryRunner.query(
        `ALTER TABLE \`virtual_persona\` ADD \`prompt\` text NOT NULL`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('virtual_persona');
    const isPromptColumnExist = table?.findColumnByName('prompt');

    if (isPromptColumnExist) {
      await queryRunner.query(
        `ALTER TABLE \`virtual_persona\` DROP COLUMN \`prompt\``
      );
    }
  }
}
