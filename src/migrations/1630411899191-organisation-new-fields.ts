import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationNewFields1630411899191 implements MigrationInterface {
  name = 'organizationNewFields1630411899191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `legalEntityName` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `domain` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `website` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `contactEmail` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      "ALTER TABLE `organization` ADD `verificationType` varchar(255) NOT NULL DEFAULT 'not-verified'"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `verificationType`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `contactEmail`'
    );
    await queryRunner.query('ALTER TABLE `organization` DROP COLUMN `website`');
    await queryRunner.query('ALTER TABLE `organization` DROP COLUMN `domain`');
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `legalEntityName`'
    );
  }
}
