import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationWithZ1631881226413 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE organisation RENAME TO organization');
    await queryRunner.query(
      'ALTER TABLE authorization_definition RENAME TO authorization_policy'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE COLUMN `organisationId` `organizationId` VARCHAR(36) NULL DEFAULT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE'
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-owner' WHERE `type` = 'organisation-owner'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-admin' WHERE `type` = 'organisation-admin'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-member' WHERE `type` = 'organisation-member'"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE organization RENAME TO organisation');
    await queryRunner.query(
      'ALTER TABLE authorization_policy RENAME TO authorization_definition'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` CHANGE COLUMN `organizationId` `organisationId` VARCHAR(36) NULL DEFAULT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation` (`id`) ON DELETE CASCADE'
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-owner' WHERE `type` = 'organization-owner'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-admin' WHERE `type` = 'organization-admin'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-member' WHERE `type` = 'organization-member'"
    );
  }
}
