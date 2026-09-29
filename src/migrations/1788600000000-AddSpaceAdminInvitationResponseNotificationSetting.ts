import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new "someone responded to an invitation" notification row
 * (`space.admin.communityInvitationResponse`) onto every existing
 * `user_settings` row.
 *
 * Before this row existed, the invitation-response notifications this row
 * now governs (organization and user, accept and decline, plus the
 * pre-existing Virtual-Contributor declined event) were governed by
 * `space.admin.communityNewMember` — which also governs the generic
 * "a new member joined" notification. Splitting them gives invitation
 * responses their own control, as required by the product decision that a
 * response to an invitation is a distinct event from someone joining
 * unprompted.
 *
 * The seeded value is therefore the row's PREDECESSOR — the user's existing
 * `space.admin.communityNewMember` value — falling back to the mandated
 * defaults `{ email: true, inApp: true, push: true }` when that key is
 * absent. Seeding a flat all-on would silently re-enable, on all three
 * channels, an event that a Space admin who muted `communityNewMember` had
 * deliberately switched off. A user who never changed the predecessor is
 * already all-on, so they get the documented default either way.
 *
 * Same shape as `AddOrganizationSpaceInvitationNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE notification #> '{space,admin,communityInvitationResponse}' IS NULL`
 *    — never touches an existing key, safely re-runnable. The nested
 *    `jsonb_set` calls materialize `notification.space` and
 *    `notification.space.admin` if either is absent.
 *  - `down`: intentional no-op — see the note on the method.
 *
 * Belt-and-braces: `UserSettings.applyInvitationResponseDefaults`
 * (`@AfterLoad`) and the recipients-service
 * `DEFAULT_INVITATION_RESPONSE_CHANNELS` fallback are the read-side
 * backstop for rows inserted by an old pod during a rolling deploy after
 * this migration has already run.
 */
export class AddSpaceAdminInvitationResponseNotificationSetting1788600000000
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
          jsonb_set(
            notification,
            '{space}'::text[],
            COALESCE(notification -> 'space', '{}'::jsonb),
            true
          ),
          '{space,admin}'::text[],
          COALESCE(notification #> '{space,admin}', '{}'::jsonb),
          true
        ),
        '{space,admin,communityInvitationResponse}'::text[],
        COALESCE(
          notification #> '{space,admin,communityNewMember}',
          $1::jsonb
        ),
        true
      )
      WHERE notification #> '{space,admin,communityInvitationResponse}' IS NULL
      `,
      [
        AddSpaceAdminInvitationResponseNotificationSetting1788600000000.DEFAULT_VALUE,
      ]
    );
  }

  // No automatic rollback, and this one is the sharpest of the three: `up`
  // DERIVES the seeded value from `communityNewMember`. Stripping the key on
  // `down` therefore discards whatever the admin has since chosen for
  // invitation responses, and the next `up` re-derives it from a predecessor
  // they may have set differently — silently overriding a recorded choice,
  // which SC-007 forbids. The key is additive and inert to older code (the
  // `@AfterLoad` backstop and DEFAULT_INVITATION_RESPONSE_CHANNELS handle its
  // absence, never its presence), so leaving it costs nothing on a rollback.
  // Operators who must truly revert should restore a pre-migration backup.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
