import { MigrationInterface, QueryRunner } from 'typeorm';

export class agentAuth1623310575144 implements MigrationInterface {
  name = 'agentAuth1623310575144';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }
}
