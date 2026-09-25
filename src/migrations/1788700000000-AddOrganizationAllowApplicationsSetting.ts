import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new "allow users to apply to associate" setting
 * (`allowApplications`) onto every existing `organization` row's `settings`
 * jsonb column, at the mandated default `true`. Cloned from
 * `AddOrganizationAllowSpaceInvitationsSetting` (1788400000000):
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE settings #> '{membership,allowApplications}' IS NULL` — never
 *    touches an existing key, safely re-runnable. The inner `jsonb_set`
 *    additionally materializes `settings.membership` itself if absent,
 *    seeded with its OTHER declared keys (never an empty object).
 *  - `down`: intentional no-op — same rationale as 1788400000000: `up`
 *    writes the constant `true` wherever the key is absent, so a
 *    down-then-up cycle would silently re-enable applications for an
 *    organization that had deliberately opted out.
 *
 * Belt-and-braces: `Organization.applyMembershipSettingsDefaults`
 * (`@AfterLoad`) and the apply-mutation's `?? true` read are the backstop
 * for rows inserted by an old pod during a rolling deploy after this
 * migration has already run.
 */
export class AddOrganizationAllowApplicationsSetting1788700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organization
      SET settings = jsonb_set(
        jsonb_set(
          settings,
          '{membership}'::text[],
          COALESCE(
            settings -> 'membership',
            '{"allowUsersMatchingDomainToJoin": false, "allowSpaceInvitations": true}'::jsonb
          ),
          true
        ),
        '{membership,allowApplications}'::text[],
        'true'::jsonb,
        true
      )
      WHERE settings #> '{membership,allowApplications}' IS NULL
    `);
  }

  // Intentional no-op. See the class docblock.
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
