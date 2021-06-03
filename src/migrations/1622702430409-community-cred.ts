import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityCred1622702430409 implements MigrationInterface {
  name = 'communityCred1622702430409';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_56f5614fff0028d40370499582` ON `application`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `credentialId` varchar(36) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD UNIQUE INDEX `IDX_973fe78e64b8a79056d58ead43` (`credentialId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_973fe78e64b8a79056d58ead43` ON `community` (`credentialId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_973fe78e64b8a79056d58ead433` FOREIGN KEY (`credentialId`) REFERENCES `credential`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_973fe78e64b8a79056d58ead433`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_973fe78e64b8a79056d58ead43` ON `community`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP INDEX `IDX_973fe78e64b8a79056d58ead43`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `credentialId`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_56f5614fff0028d40370499582` ON `application` (`authorizationId`)'
    );
  }
}
