import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvas1629887578891 implements MigrationInterface {
  name = 'canvas1629887578891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `canvas` (`id` char(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `name` text NOT NULL, `value` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD `canvasId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD UNIQUE INDEX `IDX_c9ed67519d26140f98265a542e` (`canvasId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_c9ed67519d26140f98265a542e` ON `ecosystem_model` (`canvasId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` ADD CONSTRAINT `FK_c9ed67519d26140f98265a542e7` FOREIGN KEY (`canvasId`) REFERENCES `canvas`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ecosystem_model` DROP COLUMN `canvasId`'
    );
    await queryRunner.query('DROP TABLE `canvas`');
  }
}
