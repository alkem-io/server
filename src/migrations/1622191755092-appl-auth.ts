import { MigrationInterface, QueryRunner } from 'typeorm';

export class applAuth1622191755092 implements MigrationInterface {
  name = 'applAuth1622191755092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_53fccd56207915b969b91834e0` ON `relation`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD `authorizationId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD UNIQUE INDEX `IDX_56f5614fff0028d40370499582` (`authorizationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_56f5614fff0028d40370499582` ON `application` (`authorizationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_56f5614fff0028d403704995822`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_56f5614fff0028d40370499582` ON `application`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP INDEX `IDX_56f5614fff0028d40370499582`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP COLUMN `authorizationId`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_53fccd56207915b969b91834e0` ON `relation` (`authorizationId`)'
    );
  }
}
