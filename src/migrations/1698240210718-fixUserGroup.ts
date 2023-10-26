import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixUserGroup1698240210718 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_group AS ug
      JOIN profile AS p ON ug.profileId = p.id
      SET p.displayName = ug.name WHERE p.displayName is NULL;
    `);
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE COLUMN `displayName` `displayName` text NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `profile` CHANGE COLUMN `displayName` `displayName` text NULL'
    );
  }
}
