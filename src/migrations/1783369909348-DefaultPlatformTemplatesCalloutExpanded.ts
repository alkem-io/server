import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Force the platform-level default space/subspace templates to carry
 * layout.calloutDescriptionDisplayMode = 'expanded'.
 *
 * New spaces inherit their settings from these templates first
 * (SpaceService.createSpace -> templateContentSpace.settings), and only fall
 * back to the code default in SpaceSettingsService.applyCreationDefaults when
 * the template does not already specify the value. Setting it explicitly here
 * makes the EXPANDED default authoritative in the DB for every platform default
 * template, independent of the code fallback.
 *
 * Scope: the four platform-level template_default types. Per-space
 * 'space-subspace' defaults are intentionally left untouched.
 */
export class DefaultPlatformTemplatesCalloutExpanded1783369909348
  implements MigrationInterface
{
  name = 'DefaultPlatformTemplatesCalloutExpanded1783369909348';

  private readonly platformDefaultTypes = [
    'platform-space',
    'platform-subspace',
    'platform-subspace-knowledge',
    'platform-space-tutorials',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const types = this.platformDefaultTypes;

    const before = await queryRunner.query(
      `
      SELECT COUNT(*) AS count
      FROM "template_content_space" tcs
      JOIN "template" t ON t."contentSpaceId" = tcs.id
      JOIN "template_default" td ON td."templateId" = t.id
      WHERE td.type = ANY($1)
    `,
      [types]
    );
    console.log(
      `[Migration] DefaultPlatformTemplatesCalloutExpanded: ${before[0]?.count ?? 0} platform default template content-space(s) targeted`
    );

    // Force layout.calloutDescriptionDisplayMode = 'expanded'. Ensure the
    // 'layout' object exists first (it may be missing or JSON null), then set
    // the nested key with create_missing = true.
    await queryRunner.query(
      `
      UPDATE "template_content_space" AS tcs
      SET "settings" = jsonb_set(
        jsonb_set(
          tcs."settings",
          '{layout}',
          CASE
            WHEN jsonb_typeof(tcs."settings" -> 'layout') = 'object'
              THEN tcs."settings" -> 'layout'
            ELSE '{}'::jsonb
          END,
          true
        ),
        '{layout,calloutDescriptionDisplayMode}',
        '"expanded"'::jsonb,
        true
      )
      FROM "template" t
      JOIN "template_default" td ON td."templateId" = t.id
      WHERE t."contentSpaceId" = tcs.id
        AND td.type = ANY($1)
    `,
      [types]
    );

    const remaining = await queryRunner.query(
      `
      SELECT COUNT(*) AS count
      FROM "template_content_space" tcs
      JOIN "template" t ON t."contentSpaceId" = tcs.id
      JOIN "template_default" td ON td."templateId" = t.id
      WHERE td.type = ANY($1)
        AND tcs."settings" -> 'layout' ->> 'calloutDescriptionDisplayMode'
            IS DISTINCT FROM 'expanded'
    `,
      [types]
    );
    const notExpanded = parseInt(remaining[0]?.count ?? '0', 10);
    if (notExpanded > 0) {
      console.warn(
        `[Migration] WARNING: DefaultPlatformTemplatesCalloutExpanded: ${notExpanded} platform default template(s) not set to expanded — investigate`
      );
    } else {
      console.log(
        `[Migration] DefaultPlatformTemplatesCalloutExpanded: verification passed — all targeted templates set to expanded`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const types = this.platformDefaultTypes;

    // These platform default templates carried no layout key prior to this
    // migration, so the inverse is to drop the layout key we introduced.
    await queryRunner.query(
      `
      UPDATE "template_content_space" AS tcs
      SET "settings" = tcs."settings" - 'layout'
      FROM "template" t
      JOIN "template_default" td ON td."templateId" = t.id
      WHERE t."contentSpaceId" = tcs.id
        AND td.type = ANY($1)
        AND tcs."settings" -> 'layout' IS NOT NULL
    `,
      [types]
    );
    console.log(
      `[Migration] DefaultPlatformTemplatesCalloutExpanded down(): removed layout key from platform default templates`
    );
  }
}
