import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingAllowMembersToVideoCall1759156590119
  implements MigrationInterface
{
  name = 'AddSettingAllowMembersToVideoCall1759156590119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update regular spaces in the 'space' table
    await queryRunner.query(`
      UPDATE space
      SET settings = JSON_SET(
        settings,
        '$.collaboration.allowMembersToVideoCall',
        false
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration') IS NOT NULL
    `);

    // 2. Update template content spaces in the 'template_content_space' table
    await queryRunner.query(`
      UPDATE template_content_space
      SET settings = JSON_SET(
        settings,
        '$.collaboration.allowMembersToVideoCall',
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
        '$.collaboration.allowMembersToVideoCall'
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration.allowMembersToVideoCall') IS NOT NULL
    `);

    // 2. Remove from template content spaces in the 'template_content_space' table
    await queryRunner.query(`
      UPDATE template_content_space
      SET settings = JSON_REMOVE(
        settings,
        '$.collaboration.allowMembersToVideoCall'
      )
      WHERE JSON_EXTRACT(settings, '$.collaboration.allowMembersToVideoCall') IS NOT NULL
    `);

    console.log(
      'Success: Removed setting from regular spaces and template content spaces.'
    );
  }
}
