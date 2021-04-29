import { MigrationInterface, QueryRunner } from 'typeorm';

export class usergroupOrgDelete1619246820130 implements MigrationInterface {
  name = 'usergroupOrgDelete1619246820130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_f425931bb61a95ef6f6d89c9a8` ON `project`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_6860f1e3ae5509245bdb5c401f` ON `opportunity`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_3c535130cde781b69259eec7d8` ON `challenge`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_3c535130cde781b69259eec7d8` ON `challenge` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_6860f1e3ae5509245bdb5c401f` ON `opportunity` (`lifecycleId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_f425931bb61a95ef6f6d89c9a8` ON `project` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
