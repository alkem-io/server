import { MigrationInterface, QueryRunner } from 'typeorm';

export class TempStorage1726477422137 implements MigrationInterface {
  name = 'TempStorage1726477422137';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `document` ADD `temporaryLocation` tinyint NOT NULL DEFAULT 0'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `document` DROP COLUMN `temporaryLocation`'
    );
  }
}
