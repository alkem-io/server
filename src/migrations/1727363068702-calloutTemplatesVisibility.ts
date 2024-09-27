import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutTemplatesVisibility1727363068702
  implements MigrationInterface
{
  // Bugfix Server#4568
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`callout\` ADD COLUMN \`isTemplate\` BOOLEAN NOT NULL DEFAULT FALSE AFTER \`type\`;
    `);
    await queryRunner.query(`
      UPDATE \`callout\` SET \`visibility\` = 'draft', \`isTemplate\` = 1 WHERE \`collaborationId\` IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`callout\` DROP COLUMN \`isTemplate\`;
    `);
  }
}
