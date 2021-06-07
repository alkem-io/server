import { MigrationInterface, QueryRunner } from 'typeorm';

export class ssi1623061965009 implements MigrationInterface {
  name = 'ssi1623061965009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `password` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `agent` DROP COLUMN `password`');
  }
}
