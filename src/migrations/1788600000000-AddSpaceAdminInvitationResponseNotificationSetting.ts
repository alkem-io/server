import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new "someone responded to an invitation you sent"
 * notification row (`space.admin.communityInvitationResponse`) onto every
 * existing `user_settings` row, at the mandated defaults
 * `{ email: true, inApp: true, push: true }`.
 *
 * Before this row existed, the organization accept/decline outcome
 * notifications were governed by `space.admin.communityNewMember` — which
 * also governs the generic "a new member joined" notification. Splitting
 * them gives invitation responses (organization and user, accept and
 * decline) their own control, as required by the product decision that a
 * response to an invitation is a distinct event from someone joining
 * unprompted.
 *
 * Same shape as `AddOrganizationSpaceInvitationNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE notification #> '{space,admin,communityInvitationResponse}' IS NULL`
 *    — never touches an existing key, safely re-runnable. The nested
 *    `jsonb_set` calls materialize `notification.space` and
 *    `notification.space.admin` if either is absent.
 *  - `down`: removes the key via the `#-` operator.
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
        $1::jsonb,
        true
      )
      WHERE notification #> '{space,admin,communityInvitationResponse}' IS NULL
      `,
      [
        AddSpaceAdminInvitationResponseNotificationSetting1788600000000.DEFAULT_VALUE,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = notification #- '{space,admin,communityInvitationResponse}'::text[]
      WHERE notification #> '{space,admin,communityInvitationResponse}' IS NOT NULL
    `);
  }
}
