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
 *  - `down`: removes the key via the `#-` operator.
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
          COALESCE(settings -> 'membership', '{}'::jsonb),
          true
        ),
        '{membership,allowSpaceInvitations}'::text[],
        'true'::jsonb,
        true
      )
      WHERE settings #> '{membership,allowSpaceInvitations}' IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organization
      SET settings = settings #- '{membership,allowSpaceInvitations}'::text[]
      WHERE settings #> '{membership,allowSpaceInvitations}' IS NOT NULL
    `);
  }
}
