import { MigrationInterface, QueryRunner } from 'typeorm';

export class focalPointDelete1617096567666 implements MigrationInterface {
  name = 'focalPointDelete1617096567666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_375df27b9233a3ffdd215bd1f86`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_375df27b9233a3ffdd215bd1f86` FOREIGN KEY (`focalPointId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user_group` DROP FOREIGN KEY `FK_375df27b9233a3ffdd215bd1f86`'
    );
    await queryRunner.query(
      'ALTER TABLE `user_group` ADD CONSTRAINT `FK_375df27b9233a3ffdd215bd1f86` FOREIGN KEY (`focalPointId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
