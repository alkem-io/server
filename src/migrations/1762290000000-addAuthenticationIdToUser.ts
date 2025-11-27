import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthenticationIDToUser1762290000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` ADD COLUMN `authenticationID` char(36) NULL'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_user_authenticationID` ON `user` (`authenticationID`)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_user_authenticationID` ON `user`');
    await queryRunner.query(
      'ALTER TABLE `user` DROP COLUMN `authenticationID`'
    );
  }
}
