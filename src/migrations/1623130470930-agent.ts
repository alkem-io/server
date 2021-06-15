import { MigrationInterface, QueryRunner } from 'typeorm';

export class agent1623130470930 implements MigrationInterface {
  name = 'agent1623130470930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD `agentId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD UNIQUE INDEX `IDX_7671a7e33f6665764f4534a596` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD `agentId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD UNIQUE INDEX `IDX_b0c3f360534db92017e36a00bb` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD `agentId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD UNIQUE INDEX `IDX_b025a2720e5ee0e5b38774f7a8` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `agentId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD UNIQUE INDEX `IDX_c814aa7dc8a68f27d96d5d1782` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `password` varchar(255) NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_7671a7e33f6665764f4534a596` ON `organisation` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b0c3f360534db92017e36a00bb` ON `ecoverse` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b025a2720e5ee0e5b38774f7a8` ON `challenge` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c814aa7dc8a68f27d96d5d1782` ON `opportunity` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b025a2720e5ee0e5b38774f7a8c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_c814aa7dc8a68f27d96d5d1782c` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_c814aa7dc8a68f27d96d5d1782c`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b025a2720e5ee0e5b38774f7a8c`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_b0c3f360534db92017e36a00bb2`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_7671a7e33f6665764f4534a5967`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_c814aa7dc8a68f27d96d5d1782` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_b025a2720e5ee0e5b38774f7a8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_b0c3f360534db92017e36a00bb` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_7671a7e33f6665764f4534a596` ON `organisation`'
    );
    await queryRunner.query('ALTER TABLE `agent` DROP COLUMN `password`');
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP INDEX `IDX_c814aa7dc8a68f27d96d5d1782`'
    );
    await queryRunner.query('ALTER TABLE `opportunity` DROP COLUMN `agentId`');
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP INDEX `IDX_b025a2720e5ee0e5b38774f7a8`'
    );
    await queryRunner.query('ALTER TABLE `challenge` DROP COLUMN `agentId`');
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP INDEX `IDX_b0c3f360534db92017e36a00bb`'
    );
    await queryRunner.query('ALTER TABLE `ecoverse` DROP COLUMN `agentId`');
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP INDEX `IDX_7671a7e33f6665764f4534a596`'
    );
    await queryRunner.query('ALTER TABLE `organisation` DROP COLUMN `agentId`');
  }
}
