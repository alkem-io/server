import { MigrationInterface, QueryRunner } from 'typeorm';

const table = '`canvas`';
const column = '`bannerCardID`';

export class canvasVisual1657204514370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${table} ADD ${column} char(36)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}
