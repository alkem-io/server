import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceSettingsJSON1734708463412 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` CHANGE \`settingsStr\` \`settings\` text NOT NULL`
    );
    await queryRunner.query(
      "UPDATE `space` SET `settings` = '[]' WHERE `settings` IS NULL OR `settings` = ''"
    );
    await queryRunner.query(
      'ALTER TABLE `space` MODIFY COLUMN `settings` json null'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `space` MODIFY COLUMN `settings` text'
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` CHANGE \`settings\` \`settingsStr\` text NOT NULL`
    );
  }
}
