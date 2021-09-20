import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationVerification1631992797354
  implements MigrationInterface
{
  name = 'organizationVerification1631992797354';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `organization_verification` (`id` char(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `organizationID` varchar(255) NOT NULL, `status` varchar(255) NOT NULL DEFAULT 'not-verified', `authorizationId` char(36) NULL, `lifecycleId` char(36) NULL, UNIQUE INDEX `REL_3795f9dd15ef3ef2dd1d27e309` (`authorizationId`), UNIQUE INDEX `REL_22be0d440df7972d9b3a94aa6d` (`lifecycleId`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `verificationType`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD `verificationId` char(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD UNIQUE INDEX `IDX_95bbac07221e98072beafa6173` (`verificationId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_95bbac07221e98072beafa6173` ON `organization` (`verificationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_3795f9dd15ef3ef2dd1d27e309c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` ADD CONSTRAINT `FK_22be0d440df7972d9b3a94aa6d5` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD CONSTRAINT `FK_95bbac07221e98072beafa61732` FOREIGN KEY (`verificationId`) REFERENCES `organization_verification`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_22be0d440df7972d9b3a94aa6d5`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization_verification` DROP FOREIGN KEY `FK_3795f9dd15ef3ef2dd1d27e309c`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` DROP FOREIGN KEY `FK_95bbac07221e98072beafa61732`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_95bbac07221e98072beafa6173` ON `organization`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `verificationId`'
    );
    await queryRunner.query(
      "ALTER TABLE `organization` ADD `verificationType` varchar(255) NOT NULL DEFAULT 'not-verified'"
    );
    await queryRunner.query('DROP TABLE `organization_verification`');
  }
}
