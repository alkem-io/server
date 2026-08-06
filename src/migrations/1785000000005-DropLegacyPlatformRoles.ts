import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#027-platform-role-redesign (T082, Slice B, FR-007(d)/SC-005) — the
 * subtractive cleanup: every stored grant of a retired legacy platform role
 * goes, then the role rows themselves.
 *
 * ## Order matters, and this is the only correct one
 *
 * `credential` rows first, `role` rows second. A role row with no holders is
 * inert; a credential row naming a role that no longer exists is a grant the
 * canonical map cannot resolve — the exact silent-void shape (research C1)
 * this feature exists to eliminate. If this migration is interrupted between
 * the two statements it leaves the safe half done.
 *
 * It runs AFTER the enum values are gone from the code (T077), so nothing can
 * re-issue what it deletes in the window before the new build is live.
 *
 * ## Both spellings of the two C1 defect rows
 *
 * `global-spaces-reader` and `global-community-reader` are the values ACTUALLY
 * STORED by the seed, and they match no `AuthorizationCredential` member —
 * the members carry `global-spaces-read` and `global-community-read`. Both
 * spellings are deleted: the void strings because they are what the rows
 * contain, and the correct values because any code path that resolved through
 * the canonical map (T009/T010) could have written the proper spelling. A
 * cleanup that removed only one of the two would leave grants behind under
 * the other, which is precisely how the defect survived this long.
 *
 * ## No audit records — FR-018's single carve-out
 *
 * Every other credential removal in this feature writes a
 * `platform_audit_entry`. This one deliberately does not: it is not an
 * operator revoking a role, it is the platform retiring a vocabulary, and
 * attributing thousands of rows to a migration would be attribution theatre.
 * **The migration IS the record.** The operational consequence is stated in
 * FR-018 and in the deploy runbook: the audit trail will NOT contain these
 * dropped assignments, which is why the T071a holder export must be taken
 * immediately BEFORE this runs. After it, the information exists nowhere else
 * — `client-web` removed the legacy roles from the admin UI back in Slice A,
 * taking their holder lists with them.
 *
 * ## down() is deliberately not reversible into assignments
 *
 * `down()` restores nothing. The role rows could in principle be re-inserted,
 * but WHO HELD THEM cannot be recovered from anything this migration leaves
 * behind — and a `down()` that recreated empty roles would look like a
 * rollback while silently having dropped every grant. Recovery is the T071a
 * export plus manual re-granting through the break-glass Platform Roles
 * Admin, which is the documented Slice B re-grant window, not a migration.
 */
export class DropLegacyPlatformRoles1785000000005
  implements MigrationInterface
{
  name = 'DropLegacyPlatformRoles1785000000005';

  /**
   * The retired ten role names, as stored in `role.name` on the platform
   * role-set. `registered` is NOT here — it is the baseline non-admin role and
   * survives the redesign untouched.
   */
  private static readonly RETIRED_ROLE_NAMES = [
    'global-admin',
    'global-support',
    'global-license-manager',
    'global-spaces-reader',
    'global-community-reader',
    'global-platform-manager',
    'global-support-manager',
    'platform-beta-tester',
    'platform-vc-campaign',
    'platform-assistant-access',
  ];

  /**
   * The stored `credential.type` values to delete. Twelve, not ten: the two
   * C1 defect rows contribute both their void string and their correct enum
   * value (see the class comment).
   */
  private static readonly RETIRED_CREDENTIAL_TYPES = [
    'global-admin',
    'global-support',
    'global-license-manager',
    'global-platform-manager',
    'global-support-manager',
    'beta-tester',
    'vc-campaign',
    'assistant-access',
    // C1: void string as stored, plus the enum's real value.
    'global-spaces-reader',
    'global-spaces-read',
    'global-community-reader',
    'global-community-read',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. The grants. Scoped by type only — these credential types are
    //    platform-wide by definition and carry no resourceID scoping.
    await queryRunner.query(
      `DELETE FROM credential WHERE type = ANY($1::text[])`,
      [DropLegacyPlatformRoles1785000000005.RETIRED_CREDENTIAL_TYPES]
    );

    // 2. The role rows, scoped to the PLATFORM role-set. The `name` values
    //    above are unique to the platform role set, but scoping the delete
    //    anyway keeps a future space/organization role that happened to reuse
    //    a name out of range of this statement.
    await queryRunner.query(
      `DELETE FROM role
       WHERE name = ANY($1::text[])
         AND "roleSetId" IN (SELECT id FROM role_set WHERE type = 'platform')`,
      [DropLegacyPlatformRoles1785000000005.RETIRED_ROLE_NAMES]
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Deliberately empty — see the class comment. Re-creating the role rows
    // without their holders would present as a successful rollback while the
    // grants stayed gone. Recovery is the T071a holder export plus manual
    // re-granting, not a reversal.
  }
}
