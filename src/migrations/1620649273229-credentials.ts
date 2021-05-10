import { MigrationInterface, QueryRunner } from 'typeorm';

export class credentials1620649273229 implements MigrationInterface {
  name = 'credentials1620649273229';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_cb4c7ef53da42d9759efaeb39e7`'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` DROP FOREIGN KEY `FK_b01faeff5b9c5d66d8c17abf520`'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` DROP FOREIGN KEY `FK_f0198cf63a79ffc2bfab4232492`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_5e7d69b206e4aec1c4c21655631`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_375df27b9233a3ffdd215bd1f86`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_f27e03d1f7ce0724d8814fe8411`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_cb4c7ef53da42d9759efaeb39e` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_b01faeff5b9c5d66d8c17abf52` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f0198cf63a79ffc2bfab423249` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_5e7d69b206e4aec1c4c2165563` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_f27e03d1f7ce0724d8814fe841` ON `user`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `dIDId` `agentId` int NULL'
    );
    await queryRunner.query(
      'CREATE TABLE `credential` (`id` int NOT NULL AUTO_INCREMENT, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `resourceID` int NOT NULL, `type` varchar(255) NOT NULL, `agentId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'CREATE TABLE `agent` (`id` int NOT NULL AUTO_INCREMENT, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `did` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `restrictedGroupNames`'
    );
    await queryRunner.query('ALTER TABLE `opportunity` DROP COLUMN `dIDId`');
    await queryRunner.query('ALTER TABLE `challenge` DROP COLUMN `dIDId`');
    await queryRunner.query('ALTER TABLE `ecoverse` DROP COLUMN `dIDId`');
    await queryRunner.query('ALTER TABLE `organisation` DROP COLUMN `dIDId`');
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP COLUMN `focalPointId`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP COLUMN `includeInSearch`'
    );
    await queryRunner.query(
      'ALTER TABLE `context` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
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
      'ALTER TABLE `nvp` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `community` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `agentId` `agentId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD UNIQUE INDEX `IDX_b61c694cacfab25533bd23d9ad` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b61c694cacfab25533bd23d9ad` ON `user` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` ADD CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_b61c694cacfab25533bd23d9add`'
    );
    await queryRunner.query(
      'ALTER TABLE `credential` DROP FOREIGN KEY `FK_dbe0929355f82e5995f0b7fd5e2`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_b61c694cacfab25533bd23d9ad` ON `user`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP INDEX `IDX_b61c694cacfab25533bd23d9ad`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `agentId` `agentId` int NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `community` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `application` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `nvp` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
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
      'ALTER TABLE `profile` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `tagset` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `reference` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `context` CHANGE `updatedDate` `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD `includeInSearch` tinyint NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD `focalPointId` int NULL'
    );
    await queryRunner.query('ALTER TABLE `organisation` ADD `dIDId` int NULL');
    await queryRunner.query('ALTER TABLE `ecoverse` ADD `dIDId` int NULL');
    await queryRunner.query('ALTER TABLE `challenge` ADD `dIDId` int NULL');
    await queryRunner.query('ALTER TABLE `opportunity` ADD `dIDId` int NULL');
    await queryRunner.query(
      'ALTER TABLE `community` ADD `restrictedGroupNames` text NOT NULL'
    );
    await queryRunner.query('DROP TABLE `agent`');
    await queryRunner.query('DROP TABLE `credential`');
    await queryRunner.query(
      'ALTER TABLE `user` CHANGE `agentId` `dIDId` int NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_f27e03d1f7ce0724d8814fe841` ON `user` (`dIDId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_5e7d69b206e4aec1c4c2165563` ON `organisation` (`dIDId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_f0198cf63a79ffc2bfab423249` ON `ecoverse` (`dIDId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_b01faeff5b9c5d66d8c17abf52` ON `challenge` (`dIDId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_cb4c7ef53da42d9759efaeb39e` ON `opportunity` (`dIDId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_f27e03d1f7ce0724d8814fe8411` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_375df27b9233a3ffdd215bd1f86` FOREIGN KEY (`focalPointId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_5e7d69b206e4aec1c4c21655631` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD CONSTRAINT `FK_f0198cf63a79ffc2bfab4232492` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `challenge` ADD CONSTRAINT `FK_b01faeff5b9c5d66d8c17abf520` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_cb4c7ef53da42d9759efaeb39e7` FOREIGN KEY (`dIDId`) REFERENCES `did`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
