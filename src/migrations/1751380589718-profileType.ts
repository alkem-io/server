import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileType1751380589718 implements MigrationInterface {
  name = 'ProfileType1751380589718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create a temporary column to store existing data
    await queryRunner.query(
      'ALTER TABLE `profile` ADD `type_backup` varchar(128) NULL'
    );

    // Step 2: Copy existing data to the temporary column
    await queryRunner.query('UPDATE `profile` SET `type_backup` = `type`');

    // Step 3: Drop the original column
    await queryRunner.query('ALTER TABLE `profile` DROP COLUMN `type`');

    // Step 4: Add the new enum column
    await queryRunner.query(
      "ALTER TABLE `profile` ADD `type` enum ('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona') NOT NULL"
    );

    // Step 5: Migrate data from backup column to new enum column
    // Handle known mappings and valid enum values
    await queryRunner.query(
      "UPDATE `profile` SET `type` = `type_backup` WHERE `type_backup` IN ('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona')"
    );

    // Handle legacy/invalid values by mapping them to appropriate enum values
    // Map any remaining unmapped values to a default (organization as fallback)
    await queryRunner.query(
      "UPDATE `profile` SET `type` = 'organization' WHERE `type` IS NULL"
    );

    // Step 6: Drop the temporary column
    await queryRunner.query('ALTER TABLE `profile` DROP COLUMN `type_backup`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create a temporary column to store existing enum data
    await queryRunner.query(
      'ALTER TABLE `profile` ADD `type_backup` varchar(128) NULL'
    );

    // Step 2: Copy existing enum data to the temporary column
    await queryRunner.query('UPDATE `profile` SET `type_backup` = `type`');

    // Step 3: Drop the enum column
    await queryRunner.query('ALTER TABLE `profile` DROP COLUMN `type`');

    // Step 4: Add the varchar column back
    await queryRunner.query(
      'ALTER TABLE `profile` ADD `type` varchar(128) NOT NULL'
    );

    // Step 5: Restore data from backup column
    await queryRunner.query('UPDATE `profile` SET `type` = `type_backup`');

    // Step 6: Drop the temporary column
    await queryRunner.query('ALTER TABLE `profile` DROP COLUMN `type_backup`');
  }
}
