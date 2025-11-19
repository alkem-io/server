import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAccountUpn1763587200000 implements MigrationInterface {
  name = 'RemoveAccountUpn1763587200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` DROP INDEX `IDX_c09b537a5d76200c622a0fd0b7`'
    );
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `accountUpn`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` ADD `accountUpn` varchar(128) NULL'
    );
    await queryRunner.query('UPDATE `user` SET `accountUpn` = `email`');
    await queryRunner.query(
      'ALTER TABLE `user` MODIFY `accountUpn` varchar(128) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD UNIQUE INDEX `IDX_c09b537a5d76200c622a0fd0b7` (`accountUpn`)'
    );
  }
}
