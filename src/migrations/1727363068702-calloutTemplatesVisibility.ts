import { MigrationInterface, QueryRunner } from 'typeorm';

export class CalloutTemplatesVisibility1727363068702
  implements MigrationInterface
{
  // Bugfix Server#4568
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`callout\` SET \`visibility\` = 'template' WHERE \`visibility\` = 'draft' AND \`collaborationId\` IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
