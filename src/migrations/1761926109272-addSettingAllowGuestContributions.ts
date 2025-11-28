import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingAllowGuestContributions1761926109272
  implements MigrationInterface
{
  name = 'AddSettingAllowGuestContributions1761926109272';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update regular spaces in the 'space' table
    await queryRunner.query(`
      UPDATE space
      SET settings = JSON_SET(
        settings,
        '$.collaboration.allowGuestContributions',
        false
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration') IS NOT NULL
    `);

    // 2. Update template content spaces in the 'template_content_space' table
    await queryRunner.query(`
      UPDATE template_content_space
      SET settings = JSON_SET(
        settings,
        '$.collaboration.allowGuestContributions',
        false
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration') IS NOT NULL
    `);

    console.log(
      'Success: Updated settings for regular spaces and template content spaces.'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove from regular spaces in the 'space' table
    await queryRunner.query(`
      UPDATE space
      SET settings = JSON_REMOVE(
        settings,
        '$.collaboration.allowGuestContributions'
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration.allowGuestContributions') IS NOT NULL
    `);

    // 2. Remove from template content spaces in the 'template_content_space' table
    await queryRunner.query(`
      UPDATE template_content_space
      SET settings = JSON_REMOVE(
        settings,
        '$.collaboration.allowGuestContributions'
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration.allowGuestContributions') IS NOT NULL
    `);

    console.log(
      'Success: Removed setting from regular spaces and template content spaces.'
    );
  }
}
