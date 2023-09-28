import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRowIDToJourneys1695795863585 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`space\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_0f03c61020ea0dfa0198c60304\` (\`rowId\`)
    `);
    await queryRunner.query(`
        ALTER TABLE \`challenge\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_e3b287bbffe59aba827d97d5fa\` (\`rowId\`)
    `);
    await queryRunner.query(`
        ALTER TABLE \`opportunity\` ADD \`rowId\` int NOT NULL AUTO_INCREMENT FIRST,
        ADD UNIQUE INDEX \`IDX_313c12afe69143a9ee3779b4f6\` (\`rowId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`rowId\``);
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`rowId\``);
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`rowId\``
    );
  }
}
