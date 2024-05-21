import { MigrationInterface, QueryRunner } from 'typeorm';

export class accountInnovationHub1715936821326 implements MigrationInterface {
  name = 'accountInnovationHub1715936821326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD `accountId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD UNIQUE INDEX `IDX_156fd30246eb151b9d17716abf` (`accountId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_156fd30246eb151b9d17716abf` ON `innovation_hub` (`accountId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD CONSTRAINT `FK_156fd30246eb151b9d17716abf5` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP FOREIGN KEY `FK_156fd30246eb151b9d17716abf5`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_156fd30246eb151b9d17716abf` ON `innovation_hub`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP INDEX `IDX_156fd30246eb151b9d17716abf`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP COLUMN `accountId`'
    );
  }
}
