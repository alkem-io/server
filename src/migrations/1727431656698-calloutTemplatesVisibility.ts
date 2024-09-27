import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutTemplatesVisibility1727431656698
  implements MigrationInterface
{
  name = 'CalloutTemplatesVisibility1727431656698';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `callout` ADD `isTemplate` tinyint NOT NULL DEFAULT 0'
    );
    await queryRunner.query(`
      UPDATE \`callout\` SET \`visibility\` = 'draft', \`isTemplate\` = 1 WHERE \`collaborationId\` IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `callout` DROP COLUMN `isTemplate`');
  }
}
