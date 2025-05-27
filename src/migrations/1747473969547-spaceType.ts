import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceType1747473969547 implements MigrationInterface {
  name = 'SpaceType1747473969547';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `space` DROP COLUMN `type`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `space` ADD `type` varchar(128) NOT NULL'
    );
  }
}
