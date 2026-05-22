import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `space_admin_notification_failed` value to the
 * `platform_audit_outcome` enum.
 *
 * Written by `UserEmailChangeService` when the post-commit per-space fan-out to
 * a space's admins/leads (the space-admin email-change notification) exhausts
 * its retry budget — the per-space sibling of `global_admin_notification_failed`.
 *
 * Additive enum extension — non-breaking, no table rewrite. `ADD VALUE IF NOT
 * EXISTS` keeps it idempotent and safe to re-run.
 */
export class AddEmailChangeSpaceAdminNotificationAuditOutcome1779480000000
  implements MigrationInterface
{
  name = 'AddEmailChangeSpaceAdminNotificationAuditOutcome1779480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'space_admin_notification_failed'`
    );
  }

  public async down(): Promise<void> {
    // No-op: PostgreSQL has no `ALTER TYPE ... DROP VALUE`. Removing an enum
    // value would require recreating the type and rewriting every dependent
    // column, which is unsafe once rows reference the value. Leaving the value
    // in place after a revert is harmless.
  }
}
