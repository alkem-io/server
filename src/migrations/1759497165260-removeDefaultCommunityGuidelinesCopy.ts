import { MigrationInterface, QueryRunner } from 'typeorm';

const TARGET_DISPLAY_NAME = 'Professional Networking Community Name';
const TARGET_DESCRIPTION = 'Please fill out the community guidelines here';
// markdown field adds '\n' at the end of the strings
const TARGET_DESCRIPTION_WITH_NEWLINE =
  'Please fill out the community guidelines here\n';
const TARGET_DESCRIPTION_WITH_CRLF =
  'Please fill out the community guidelines here\r\n';

export class RemoveDefaultCommunityGuidelinesCopy1759497165260
  implements MigrationInterface
{
  name = 'RemoveDefaultCommunityGuidelinesCopy1759497165260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`profile\` p
                INNER JOIN \`community_guidelines\` g ON g.\`profileId\` = p.\`id\`
            SET
                p.\`displayName\` = CASE WHEN p.\`displayName\` = ? THEN '' ELSE p.\`displayName\` END,
                p.\`description\` = CASE WHEN p.\`description\` IN (?, ?, ?) THEN '' ELSE p.\`description\` END
            WHERE p.\`displayName\` = ? OR p.\`description\` IN (?, ?, ?)`,
      [
        TARGET_DISPLAY_NAME,
        TARGET_DESCRIPTION,
        TARGET_DESCRIPTION_WITH_NEWLINE,
        TARGET_DESCRIPTION_WITH_CRLF,
        TARGET_DISPLAY_NAME,
        TARGET_DESCRIPTION,
        TARGET_DESCRIPTION_WITH_NEWLINE,
        TARGET_DESCRIPTION_WITH_CRLF,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
