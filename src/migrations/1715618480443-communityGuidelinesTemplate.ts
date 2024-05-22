import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityGuidelinesTemplate1715618480443
  implements MigrationInterface
{
  name = 'communityGuidelinesTemplate1715618480443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `community_guidelines_template` (`id` char(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `authorizationId` char(36) NULL, `profileId` char(36) NULL, `templatesSetId` char(36) NULL, `guidelinesId` char(36) NULL, UNIQUE INDEX `REL_eb3f02cf18df8943da1673a25b` (`authorizationId`), UNIQUE INDEX `REL_25dbe2675edea7b3c4f4aec430` (`profileId`), UNIQUE INDEX `REL_e1817f55e97bba03a57b928725` (`guidelinesId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` ADD CONSTRAINT `FK_eb3f02cf18df8943da1673a25b8` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` ADD CONSTRAINT `FK_25dbe2675edea7b3c4f4aec4300` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` ADD CONSTRAINT `FK_8b2d7f497cccf9cac312dac8b46` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` ADD CONSTRAINT `FK_e1817f55e97bba03a57b9287251` FOREIGN KEY (`guidelinesId`) REFERENCES `community_guidelines`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` DROP FOREIGN KEY `FK_e1817f55e97bba03a57b9287251`'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` DROP FOREIGN KEY `FK_8b2d7f497cccf9cac312dac8b46`'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` DROP FOREIGN KEY `FK_25dbe2675edea7b3c4f4aec4300`'
    );
    await queryRunner.query(
      'ALTER TABLE `community_guidelines_template` DROP FOREIGN KEY `FK_eb3f02cf18df8943da1673a25b8`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_e1817f55e97bba03a57b928725` ON `community_guidelines_template`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_25dbe2675edea7b3c4f4aec430` ON `community_guidelines_template`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_eb3f02cf18df8943da1673a25b` ON `community_guidelines_template`'
    );
    await queryRunner.query('DROP TABLE `community_guidelines_template`');
  }
}
