import { MigrationInterface, QueryRunner } from 'typeorm';

export class organisationNewFields1630411899191 implements MigrationInterface {
  name = 'organisationNewFields1630411899191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `legalEntityName` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `domain` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `website` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `contactEmail` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      "ALTER TABLE `organisation` ADD `verificationType` varchar(255) NOT NULL DEFAULT 'not-verified'"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP COLUMN `verificationType`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP COLUMN `contactEmail`'
    );
    await queryRunner.query('ALTER TABLE `organisation` DROP COLUMN `website`');
    await queryRunner.query('ALTER TABLE `organisation` DROP COLUMN `domain`');
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP COLUMN `legalEntityName`'
    );
  }
}
