import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycles1617444979826 implements MigrationInterface {
  name = 'lifecycles1617444979826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `lifecycle` (`id` int NOT NULL AUTO_INCREMENT, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `state` text NULL, `machine` text NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD `lifecycleId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `application` ADD UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `did` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `context` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `community` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
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
      'ALTER TABLE `challenge` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `community` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `relation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `aspect` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `actor` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `context` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `did` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d`'
    );
    await queryRunner.query(
      'ALTER TABLE `application` DROP COLUMN `lifecycleId`'
    );
    await queryRunner.query('DROP TABLE `lifecycle`');
  }
}
