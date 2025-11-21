import { MigrationInterface, QueryRunner } from 'typeorm';

export class VirtualContributorPlatformSettings1764000000000
  implements MigrationInterface
{
  name = 'VirtualContributorPlatformSettings1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` ADD `platformSettings` json NULL'
    );

    await queryRunner.query(
      `UPDATE \`virtual_contributor\` SET platformSettings = '{"promptGraphEditingEnabled": false}' WHERE platformSettings IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` DROP COLUMN `platformSettings`'
    );
  }
}
