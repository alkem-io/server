import {MigrationInterface, QueryRunner} from "typeorm";

export class dropTemplates1608136134669 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query("ALTER TABLE `template_members` DROP FOREIGN KEY `FK_3945ecdb1ec03ce9e19a314f0ff`");
      await queryRunner.query("ALTER TABLE `template_members` DROP FOREIGN KEY `FK_b925eed4a89028ce4a8c0f699a4`");
      await queryRunner.query("ALTER TABLE `template` DROP FOREIGN KEY `FK_e7a620679f10cf24e07d7ac8b1c`");
      await queryRunner.query("DROP INDEX `IDX_3945ecdb1ec03ce9e19a314f0f` ON `template_members`");
      await queryRunner.query("DROP INDEX `IDX_b925eed4a89028ce4a8c0f699a` ON `template_members`");
      await queryRunner.query("DROP TABLE `template_members`");
      await queryRunner.query("DROP TABLE `template`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query("CREATE TABLE `template` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` varchar(300) NOT NULL, `ecoverseId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
      await queryRunner.query("CREATE TABLE `template_members` (`templateId` int NOT NULL, `userId` int NOT NULL, INDEX `IDX_b925eed4a89028ce4a8c0f699a` (`templateId`), INDEX `IDX_3945ecdb1ec03ce9e19a314f0f` (`userId`), PRIMARY KEY (`templateId`, `userId`)) ENGINE=InnoDB");
      await queryRunner.query("ALTER TABLE `template` ADD CONSTRAINT `FK_e7a620679f10cf24e07d7ac8b1c` FOREIGN KEY (`ecoverseId`) REFERENCES `ecoverse`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
      await queryRunner.query("ALTER TABLE `template_members` ADD CONSTRAINT `FK_b925eed4a89028ce4a8c0f699a4` FOREIGN KEY (`templateId`) REFERENCES `template`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
      await queryRunner.query("ALTER TABLE `template_members` ADD CONSTRAINT `FK_3945ecdb1ec03ce9e19a314f0ff` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
    }

}
