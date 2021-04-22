import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycleChallenges1619068369831 implements MigrationInterface {
  name = 'lifecycleChallenges1619068369831';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `state` `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `state` `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` CHANGE `state` `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `lifecycleId`');
    await queryRunner.query('ALTER TABLE `project` ADD `lifecycleId` int NULL');
    await queryRunner.query(
      'ALTER TABLE `project` ADD UNIQUE INDEX `IDX_f425931bb61a95ef6f6d89c9a8` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `lifecycleId`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `lifecycleId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD UNIQUE INDEX `IDX_6860f1e3ae5509245bdb5c401f` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `lifecycleId`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `lifecycleId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD UNIQUE INDEX `IDX_3c535130cde781b69259eec7d8` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_f425931bb61a95ef6f6d89c9a8` ON `project` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_6860f1e3ae5509245bdb5c401f` ON `opportunity` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_3c535130cde781b69259eec7d8` ON `challenge` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_3c535130cde781b69259eec7d85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_3c535130cde781b69259eec7d85`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_6860f1e3ae5509245bdb5c401f3`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_3c535130cde781b69259eec7d8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_6860f1e3ae5509245bdb5c401f` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f425931bb61a95ef6f6d89c9a8` ON `project`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP INDEX `IDX_3c535130cde781b69259eec7d8`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP COLUMN `lifecycleId`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP INDEX `IDX_6860f1e3ae5509245bdb5c401f`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `lifecycleId`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP INDEX `IDX_f425931bb61a95ef6f6d89c9a8`'
    );
    await queryRunner.query('ALTER TABLE `project` DROP COLUMN `lifecycleId`');
    await queryRunner.query(
      'ALTER TABLE `project` ADD `lifecycleId` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` CHANGE `lifecycleId` `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `lifecycleId` `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `lifecycleId` `state` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application` (`lifecycleId`)'
    );
  }
}
