import { MigrationInterface, QueryRunner } from 'typeorm';

export class orgUsergroupDelete1619156059936 implements MigrationInterface {
  name = 'orgUsergroupDelete1619156059936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_2b8381df8c3a1680f50e4bc2351`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application`'
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
      'CREATE UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application` (`lifecycleId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
