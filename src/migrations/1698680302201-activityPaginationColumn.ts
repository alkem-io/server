import { MigrationInterface, QueryRunner } from 'typeorm';

export class activityPaginationColumn1698680302201
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`activity\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` (\`rowId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`activity\` DROP COLUMN \`rowId\``);
  }
}
