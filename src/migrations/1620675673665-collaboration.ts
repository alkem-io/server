import { MigrationInterface, QueryRunner } from 'typeorm';

export class collaboration1620675673665 implements MigrationInterface {
  name = 'collaboration1620675673665';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_d6d967126caae9df4c763985f9b`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_35e34564793a27bb3c209a15245`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` CHANGE `opportunityId` `collaborationId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `opportunityId` `collaborationId` int NULL'
    );
    await queryRunner.query(
      'CREATE TABLE `collaboration` (`id` int NOT NULL AUTO_INCREMENT, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD `collaborationId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD UNIQUE INDEX `IDX_fa617e79d6b2926edc7b4a3878` (`collaborationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_fa617e79d6b2926edc7b4a3878` ON `opportunity` (`collaborationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_701a6f8e3e1da76354571767c3f` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_534fac334526e373b95d3ae18e3` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_fa617e79d6b2926edc7b4a3878f` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_fa617e79d6b2926edc7b4a3878f`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_534fac334526e373b95d3ae18e3`'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` DROP FOREIGN KEY `FK_701a6f8e3e1da76354571767c3f`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_fa617e79d6b2926edc7b4a3878` ON `opportunity`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP INDEX `IDX_fa617e79d6b2926edc7b4a3878`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP COLUMN `collaborationId`'
    );
    await queryRunner.query('DROP TABLE `collaboration`');
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `collaborationId` `opportunityId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` CHANGE `collaborationId` `opportunityId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` ADD CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
