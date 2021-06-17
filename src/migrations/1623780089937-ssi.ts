import { MigrationInterface, QueryRunner } from 'typeorm';

export class ssi1623780089937 implements MigrationInterface {
  name = 'ssi1623780089937';

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
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD UNIQUE INDEX `IDX_8ed9d1af584fa62f1ad3405b33` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_8ed9d1af584fa62f1ad3405b33` ON `agent` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `agent` DROP FOREIGN KEY `FK_8ed9d1af584fa62f1ad3405b33b`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_8ed9d1af584fa62f1ad3405b33` ON `agent`'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` DROP INDEX `IDX_8ed9d1af584fa62f1ad3405b33`'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` DROP COLUMN `authorizationId`'
    );
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
