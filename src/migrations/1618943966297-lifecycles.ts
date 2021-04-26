import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycles1618943966297 implements MigrationInterface {
  name = 'lifecycles1618943966297';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `status` `lifecycleId` int NOT NULL'
    );
    await queryRunner.query(
      'CREATE TABLE `lifecycle` (`id` int NOT NULL AUTO_INCREMENT, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `machineState` text NULL, `machineDef` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `lifecycleId` `lifecycleId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_7ec2857c7d8d16432ffca1cb3d` ON `application` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `application` DROP FOREIGN KEY `FK_7ec2857c7d8d16432ffca1cb3d9`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_7ec2857c7d8d16432ffca1cb3d` ON `application`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `lifecycleId` `lifecycleId` int NOT NULL'
    );
    await queryRunner.query('DROP TABLE `lifecycle`');
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `lifecycleId` `status` int NOT NULL'
    );
  }
}
