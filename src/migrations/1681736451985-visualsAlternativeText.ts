import { MigrationInterface, QueryRunner } from 'typeorm';

export class visualsAlternativeText1681736451985 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `visual` ADD `alternativeText` varchar(120) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `visual` DROP COLUMN `alternativeText`'
    );
  }
}
