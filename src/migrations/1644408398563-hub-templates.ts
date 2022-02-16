import { MigrationInterface, QueryRunner } from 'typeorm';

export class hubTemplates1644408398563 implements MigrationInterface {
  name = 'hubTemplates1644408398563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`template\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`hub\` DROP COLUMN \`template\``);
  }
}
