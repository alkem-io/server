import { MigrationInterface, QueryRunner } from 'typeorm';

export class RaiseOrganizationAdminLimit1785700000000
  implements MigrationInterface
{
  // AC1 of alkem-io/client-web#10132: raise the organization admin cap from
  // 3 to 6. The cap is enforced in RoleSetService from each role row's
  // persisted `userPolicy.maximum`, not from the code constant — the constant
  // change only affects newly created organizations. This backfill lifts the
  // limit for organizations that already exist. Server-only; the OWNER role is
  // deliberately left untouched.
  //
  // Idempotent and tightly scoped: the credential type predicate keeps this to
  // organization ADMIN roles, so space/platform roles that also carry
  // name = 'admin' are never touched, and the maximum = '3' guard means a
  // re-run (or rows already lifted, e.g. newly created orgs) is a no-op.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role"
      SET "userPolicy" = jsonb_set("userPolicy", '{maximum}', '6')
      WHERE name = 'admin'
        AND "credential"->>'type' = 'organization-admin'
        AND "userPolicy"->>'maximum' = '3'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback note: this reverts EVERY organization ADMIN role still at
    // maximum = 6 back to 3 — not only the rows `up` touched. That is the
    // intended semantics: a rollback withdraws the raised-limit feature, so all
    // organizations return to the previous cap of 3 (organizations created
    // after deploy with the new default of 6 are included by design, and are
    // reverted alongside the code constant). It is non-destructive —
    // userPolicy.maximum only gates NEW admin assignments and never removes
    // admins already granted, so no membership is lost. Reverting to the prior
    // uniform value is therefore both correct and idempotent, so no
    // migration-owned row-state tracking is needed.
    await queryRunner.query(`
      UPDATE "role"
      SET "userPolicy" = jsonb_set("userPolicy", '{maximum}', '3')
      WHERE name = 'admin'
        AND "credential"->>'type' = 'organization-admin'
        AND "userPolicy"->>'maximum' = '6'
    `);
  }
}
