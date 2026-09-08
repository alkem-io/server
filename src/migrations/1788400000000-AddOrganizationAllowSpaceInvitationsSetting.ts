import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new "allow Spaces to invite this organization" setting
 * (`allowSpaceInvitations`) onto every existing `organization` row's
 * `settings` jsonb column, at the mandated default `true`. Modelled on
 * `AddCalloutReactionNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE settings #> '{membership,allowSpaceInvitations}' IS NULL` —
 *    never touches an existing key, safely re-runnable. The inner
 *    `jsonb_set` additionally materializes `settings.membership` itself if
 *    absent.
 *  - `down`: intentional no-op — see the note on the method.
 *
 * Belt-and-braces: `Organization.applyMembershipSettingsDefaults`
 * (`@AfterLoad`) and the invite guard's `?? true` read are the backstop for
 * rows inserted by an old pod during a rolling deploy after this migration
 * has already run.
 */
export class AddOrganizationAllowSpaceInvitationsSetting1788400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organization
      SET settings = jsonb_set(
        jsonb_set(
          settings,
          '{membership}'::text[],
          -- Materialize membership with its OTHER declared key, not an empty
          -- object: allowUsersMatchingDomainToJoin is declared non-null on
          -- OrganizationSettingsMembership, and applyMembershipSettingsDefaults
          -- only ever fills allowSpaceInvitations. Seeding an empty object here
          -- would persist a membership object the entity's own type says cannot
          -- exist. false is what organization.service.ts writes at creation.
          COALESCE(
            settings -> 'membership',
            '{"allowUsersMatchingDomainToJoin": false}'::jsonb
          ),
          true
        ),
        '{membership,allowSpaceInvitations}'::text[],
        'true'::jsonb,
        true
      )
      WHERE settings #> '{membership,allowSpaceInvitations}' IS NULL
    `);
  }

  // No automatic rollback. Stripping the key is not the inverse of seeding it:
  // `up` writes the constant `true` wherever the key is absent, so a
  // down-then-up cycle silently re-enables Space invitations for every
  // organization that had deliberately opted OUT — reversing a recorded
  // consent decision, which SC-007 forbids ("no existing user's recorded
  // choice is silently overridden"). The key is additive and inert to older
  // code, so leaving it costs nothing on a rollback. Operators who must truly
  // revert should restore a pre-migration backup.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
