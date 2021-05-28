import { MigrationInterface, QueryRunner } from 'typeorm';

export class authorizable21622184372462 implements MigrationInterface {
  name = 'authorizable21622184372462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_bde98d59e8984e7d17034c3b93` ON `actor_group`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_a2afa3851ea733de932251b3a1` ON `actor`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c52470717008d58ec6d76b12ff` ON `aspect`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_658580aea4e1a892227e27db90` ON `ecosystem_model`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD UNIQUE INDEX `IDX_53fccd56207915b969b91834e0` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_53fccd56207915b969b91834e0` ON `relation` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_53fccd56207915b969b91834e04`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_53fccd56207915b969b91834e0` ON `relation`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP INDEX `IDX_53fccd56207915b969b91834e0`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP COLUMN `authorizationId`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_658580aea4e1a892227e27db90` ON `ecosystem_model` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c52470717008d58ec6d76b12ff` ON `aspect` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_a2afa3851ea733de932251b3a1` ON `actor` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_bde98d59e8984e7d17034c3b93` ON `actor_group` (`authorizationId`)'
    );
  }
}
