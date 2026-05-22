import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `commit_started` value to the `platform_audit_outcome` enum.
 *
 * `commit_started` is the email-change crash-window breadcrumb (spec 097 FR-009c /
 * research.md §R15): `UserEmailChangeService.commitAcrossSides` writes a
 * `commit_started` audit row BEFORE the forward Kratos write, so that a process
 * death between the Kratos write and the Alkemio write leaves a durable,
 * correlatable trail that `adminUserEmailChangeDriftResolve` can reconcile.
 *
 * Additive enum extension — non-breaking, no table rewrite. `ADD VALUE IF NOT
 * EXISTS` keeps it idempotent and safe to re-run.
 */
export class AddEmailChangeCommitStartedAuditOutcome1779372350382
  implements MigrationInterface
{
  name = 'AddEmailChangeCommitStartedAuditOutcome1779372350382';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'commit_started'`
    );
  }

  public async down(): Promise<void> {
    // No-op: PostgreSQL has no `ALTER TYPE ... DROP VALUE`. Removing an enum value
    // would require recreating the type and rewriting every dependent column, which
    // is unsafe once `commit_started` rows exist. Leaving the value in place after a
    // revert is harmless — no row references it unless the feature code runs.
  }
}
