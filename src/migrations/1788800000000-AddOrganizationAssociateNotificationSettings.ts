import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills all five new organization-associate notification rows onto every
 * existing `user_settings` row, at the mandated defaults
 * `{ email: true, inApp: true, push: true }`:
 *
 *  - user-side, under `notification.user.membership`:
 *    `organizationAssociateInvitationReceived`,
 *    `organizationAssociateApplicationDecided`
 *  - organization-side, under `notification.organization`:
 *    `adminAssociateInvitationResponse`,
 *    `adminAssociateApplicationReceived`, `adminAssociateJoined`
 *
 * Modelled on `AddOrganizationSpaceInvitationNotificationSettings`
 * (1788500000000), with one deliberate difference: all five keys are seeded
 * by a SINGLE `UPDATE`, so each row is rewritten at most once instead of
 * once per key. A jsonb column update is a full row rewrite, so five passes
 * cost five rewrites (and five sets of dead tuples) for one logical change.
 *
 *  - `up`: additive-only, nested `jsonb_set`s. Every key is written as
 *    `COALESCE(<existing value>, <default>)`, so a key that is already
 *    present keeps its recorded value untouched; the row-level guard skips
 *    rows that already carry all five. Safely re-runnable, and correct for
 *    rows carrying only some of the five. The outer `jsonb_set`s materialize
 *    the `notification.user`, `notification.user.membership` and
 *    `notification.organization` containers first, because `jsonb_set` is a
 *    no-op when an intermediate path element is missing (an older healing
 *    migration can leave `notification.user = {}`); otherwise such rows
 *    would match the guard on every run and never receive the keys.
 *  - `down`: intentional no-op — see the note on the method.
 *
 * Belt-and-braces: `UserSettings.applyOrganizationAssociateDefaults`
 * (`@AfterLoad`) and the recipients-service
 * `DEFAULT_ORGANIZATION_ASSOCIATE_CHANNELS` fallback are the read-side
 * backstop for rows inserted by an old pod during a rolling deploy after
 * this migration has already run.
 */
export class AddOrganizationAssociateNotificationSettings1788800000000
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
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      notification,
                      '{user}'::text[],
                      COALESCE(notification -> 'user', '{}'::jsonb),
                      true
                    ),
                    '{user,membership}'::text[],
                    COALESCE(notification #> '{user,membership}', '{}'::jsonb),
                    true
                  ),
                  '{user,membership,organizationAssociateInvitationReceived}'::text[],
                  COALESCE(
                    notification #> '{user,membership,organizationAssociateInvitationReceived}',
                    $1::jsonb
                  ),
                  true
                ),
                '{user,membership,organizationAssociateApplicationDecided}'::text[],
                COALESCE(
                  notification #> '{user,membership,organizationAssociateApplicationDecided}',
                  $1::jsonb
                ),
                true
              ),
              '{organization}'::text[],
              COALESCE(notification -> 'organization', '{}'::jsonb),
              true
            ),
            '{organization,adminAssociateInvitationResponse}'::text[],
            COALESCE(
              notification #> '{organization,adminAssociateInvitationResponse}',
              $1::jsonb
            ),
            true
          ),
          '{organization,adminAssociateApplicationReceived}'::text[],
          COALESCE(
            notification #> '{organization,adminAssociateApplicationReceived}',
            $1::jsonb
          ),
          true
        ),
        '{organization,adminAssociateJoined}'::text[],
        COALESCE(
          notification #> '{organization,adminAssociateJoined}',
          $1::jsonb
        ),
        true
      )
      WHERE notification #> '{user,membership,organizationAssociateInvitationReceived}' IS NULL
         OR notification #> '{user,membership,organizationAssociateApplicationDecided}' IS NULL
         OR notification #> '{organization,adminAssociateInvitationResponse}' IS NULL
         OR notification #> '{organization,adminAssociateApplicationReceived}' IS NULL
         OR notification #> '{organization,adminAssociateJoined}' IS NULL
      `,
      [AddOrganizationAssociateNotificationSettings1788800000000.DEFAULT_VALUE]
    );
  }

  // No automatic rollback. Stripping the keys is not the inverse of seeding
  // them: `up` writes the all-on default wherever a key is absent, so a
  // down-then-up cycle silently re-enables, on every channel, a notification
  // that a user or organization admin had switched off — exactly the silent
  // override of a recorded choice SC-007 forbids. The keys are additive and
  // inert to older code, so leaving them costs nothing on a rollback.
  // Operators who must truly revert should restore a pre-migration backup.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
