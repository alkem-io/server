import { MigrationInterface, QueryRunner } from 'typeorm';

export class authContext1622181955848 implements MigrationInterface {
  name = 'authContext1622181955848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD UNIQUE INDEX `IDX_bde98d59e8984e7d17034c3b93` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD UNIQUE INDEX `IDX_a2afa3851ea733de932251b3a1` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD UNIQUE INDEX `IDX_c52470717008d58ec6d76b12ff` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD UNIQUE INDEX `IDX_658580aea4e1a892227e27db90` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_bde98d59e8984e7d17034c3b93` ON `actor_group` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_a2afa3851ea733de932251b3a1` ON `actor` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c52470717008d58ec6d76b12ff` ON `aspect` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_658580aea4e1a892227e27db90` ON `ecosystem_model` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` ADD CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` ADD CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` ADD CONSTRAINT `FK_c52470717008d58ec6d76b12ffa` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP FOREIGN KEY `FK_658580aea4e1a892227e27db902`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP FOREIGN KEY `FK_c52470717008d58ec6d76b12ffa`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP FOREIGN KEY `FK_a2afa3851ea733de932251b3a1f`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP FOREIGN KEY `FK_bde98d59e8984e7d17034c3b937`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_658580aea4e1a892227e27db90` ON `ecosystem_model`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_c52470717008d58ec6d76b12ff` ON `aspect`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_a2afa3851ea733de932251b3a1` ON `actor`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_bde98d59e8984e7d17034c3b93` ON `actor_group`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP INDEX `IDX_658580aea4e1a892227e27db90`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP COLUMN `authorizationId`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP INDEX `IDX_c52470717008d58ec6d76b12ff`'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` DROP COLUMN `authorizationId`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP INDEX `IDX_a2afa3851ea733de932251b3a1`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` DROP COLUMN `authorizationId`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP INDEX `IDX_bde98d59e8984e7d17034c3b93`'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` DROP COLUMN `authorizationId`'
    );
  }
}
