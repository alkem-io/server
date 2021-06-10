import { MigrationInterface, QueryRunner } from 'typeorm';

export class verifiedCreds1623306884175 implements MigrationInterface {
  name = 'verifiedCreds1623306884175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_7671a7e33f6665764f4534a596` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b0c3f360534db92017e36a00bb` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b025a2720e5ee0e5b38774f7a8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c814aa7dc8a68f27d96d5d1782` ON `opportunity`'
    );
    await queryRunner.query(
      'ALTER TABLE `authorization_definition` ADD `verifiedCredentialRules` text NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `authorization_definition` DROP COLUMN `verifiedCredentialRules`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c814aa7dc8a68f27d96d5d1782` ON `opportunity` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b025a2720e5ee0e5b38774f7a8` ON `challenge` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b0c3f360534db92017e36a00bb` ON `ecoverse` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7671a7e33f6665764f4534a596` ON `organisation` (`agentId`)'
    );
  }
}
