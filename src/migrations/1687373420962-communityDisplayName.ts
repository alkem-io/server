import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityDisplayName1687373420962 implements MigrationInterface {
  name = 'communityDisplayName1687373420962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`displayName\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` ADD `displayName` varchar(255) NULL'
    );
    // Todo: add back in the actual value via lookup for profile to use for a community?
  }
}
