import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new "an organization you administer is invited to a Space"
 * notification row (`adminSpaceCommunityInvitation`) onto every existing
 * `user_settings` row, at the mandated defaults
 * `{ email: true, inApp: true, push: true }`. Modelled on
 * `AddCalloutReactionNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE notification #> '{organization,adminSpaceCommunityInvitation}' IS NULL`
 *    — never touches an existing key, safely re-runnable. The inner
 *    `jsonb_set` additionally materializes `notification.organization`
 *    itself if absent.
 *  - `down`: removes the key via the `#-` operator.
 *
 * Belt-and-braces: `UserSettings.applyOrganizationSpaceInvitationDefaults`
 * (`@AfterLoad`) and the recipients-service
 * `DEFAULT_ORGANIZATION_SPACE_INVITATION_CHANNELS` fallback are the
 * read-side backstop for rows inserted by an old pod during a rolling
 * deploy after this migration has already run.
 */
export class AddOrganizationSpaceInvitationNotificationSettings1788500000000
  implements MigrationInterface
{
  private static readonly DEFAULT_VALUE = JSON.stringify({
    email: true,
    inApp: true,
    push: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE user_settings
      SET notification = jsonb_set(
        jsonb_set(
          notification,
          '{organization}'::text[],
          COALESCE(notification -> 'organization', '{}'::jsonb),
          true
        ),
        '{organization,adminSpaceCommunityInvitation}'::text[],
        $1::jsonb,
        true
      )
      WHERE notification #> '{organization,adminSpaceCommunityInvitation}' IS NULL
      `,
      [
        AddOrganizationSpaceInvitationNotificationSettings1788500000000
          .DEFAULT_VALUE,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = notification #- '{organization,adminSpaceCommunityInvitation}'::text[]
      WHERE notification #> '{organization,adminSpaceCommunityInvitation}' IS NOT NULL
    `);
  }
}
