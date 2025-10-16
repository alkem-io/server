import { MigrationInterface, QueryRunner } from 'typeorm';

// Context: Follow-up to migration 1759497165260-removeDefaultCommunityGuidelinesCopy
// Issue: https://github.com/alkem-io/client-web/issues/8708
// QA reported the Community Guidelines title still visible after the first cleanup.
// Root cause: The original migration only cleared the exact placeholder
//  'Professional Networking Community Name'. However, when seeding templates
//  (see 1748628720999-spaceTemplate.ts) the profile displayName was stored as
//  `${displayName} Template`, resulting in 'Professional Networking Community Name Template'.
// This follow-up migration removes BOTH variants safely & idempotently.

const BASE_DISPLAY_NAME = 'Professional Networking Community Name';
const TEMPLATE_VARIANT_DISPLAY_NAME =
  'Professional Networking Community Name Template';

export class RemoveDefaultCommunityGuidelinesDisplayNameVariants1759740000000
  implements MigrationInterface
{
  name = 'RemoveDefaultCommunityGuidelinesDisplayNameVariants1759740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only target guidelines profiles; leave any legitimately renamed ones intact.
    // Idempotent: running again finds no rows once cleared (displayName = '').
    await queryRunner.query(
      `UPDATE \`profile\` p
        INNER JOIN \`community_guidelines\` g ON g.\`profileId\` = p.\`id\`
      SET
        p.\`displayName\` = CASE
          WHEN p.\`displayName\` IN (?, ?) THEN ''
          ELSE p.\`displayName\`
        END
      WHERE p.\`displayName\` IN (?, ?)`,
      [
        BASE_DISPLAY_NAME,
        TEMPLATE_VARIANT_DISPLAY_NAME,
        BASE_DISPLAY_NAME,
        TEMPLATE_VARIANT_DISPLAY_NAME,
      ]
    );
  }

  public async down(): Promise<void> {
    // No-op: we intentionally do not restore placeholder titles once removed.
  }
}
