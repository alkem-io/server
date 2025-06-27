import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultDisplayNameOnContributions1751016555012
  implements MigrationInterface
{
  name = 'DefaultDisplayNameOnContributions1751016555012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution_defaults\` ADD \`defaultDisplayName\` text NULL AFTER \`version\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution_defaults\` DROP COLUMN \`defaultDisplayName\``
    );
  }
}
