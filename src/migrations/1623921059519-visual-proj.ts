import { MigrationInterface, QueryRunner } from 'typeorm';

export class visualProj1623921059519 implements MigrationInterface {
  name = 'visualProj1623921059519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_8ed9d1af584fa62f1ad3405b33` ON `agent`'
    );
    await queryRunner.query(
      'CREATE TABLE `visual` (`id` varchar(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `avatar` text NOT NULL, `background` text NOT NULL, `banner` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD `visualId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD UNIQUE INDEX `IDX_9dd986ff532f7e2447ffe4934d` (`visualId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_9dd986ff532f7e2447ffe4934d` ON `context` (`visualId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `context` ADD CONSTRAINT `FK_9dd986ff532f7e2447ffe4934d2` FOREIGN KEY (`visualId`) REFERENCES `visual`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `context` DROP FOREIGN KEY `FK_9dd986ff532f7e2447ffe4934d2`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_9dd986ff532f7e2447ffe4934d` ON `context`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` DROP INDEX `IDX_9dd986ff532f7e2447ffe4934d`'
    );
    await queryRunner.query('ALTER TABLE `context` DROP COLUMN `visualId`');
    await queryRunner.query('DROP TABLE `visual`');
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_8ed9d1af584fa62f1ad3405b33` ON `agent` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
