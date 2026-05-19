import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces the platform-wide audit-log foundation (data-model.md §Table 1).
 *
 * - 3 Postgres enum types: `platform_audit_category`, `platform_audit_outcome`,
 *   `platform_audit_initiator_role` (all cross-category; future ISO 27001
 *   categories extend additively).
 * - 1 table: `platform_audit_entry` (every typed column generic;
 *   category-specific payload lives in `details: jsonb`).
 * - 5 indices: PK, row_id, subject+category+created_date, subject+category+row_id,
 *   partial on correlation_id WHERE correlation_id IS NOT NULL.
 *
 * No FK constraints on `subject_user_id` / `initiator_user_id` (data-model.md
 * §Retention and user deletion — audit rows survive user deletion as forensic
 * evidence).
 */
export class CreatePlatformAuditEntry1779195577000
  implements MigrationInterface
{
  name = 'CreatePlatformAuditEntry1779195577000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "platform_audit_category" AS ENUM (
        'email_change'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "platform_audit_outcome" AS ENUM (
        'committed',
        'rolled_back',
        'drift_detected',
        'drift_resolved',
        'drift_resolution_failed',
        'security_signal_failed',
        'new_address_notification_failed',
        'global_admin_notification_failed',
        'session_invalidation_failed',
        'rejected_validation',
        'rejected_conflict'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "platform_audit_initiator_role" AS ENUM (
        'self',
        'platform_admin',
        'system',
        'service'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "platform_audit_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "rowId" SERIAL NOT NULL,
        "category" "platform_audit_category" NOT NULL,
        "subjectUserId" uuid NOT NULL,
        "initiatorUserId" uuid NULL,
        "initiatorRole" "platform_audit_initiator_role" NOT NULL,
        "outcome" "platform_audit_outcome" NOT NULL,
        "failureReason" varchar(128) NULL,
        "correlationId" uuid NULL,
        "details" jsonb NULL,
        CONSTRAINT "PK_platform_audit_entry_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_audit_entry_rowId" UNIQUE ("rowId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_platform_audit_entry_subject_category_created"
        ON "platform_audit_entry" ("subjectUserId", "category", "createdDate" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_platform_audit_entry_subject_category_rowid"
        ON "platform_audit_entry" ("subjectUserId", "category", "rowId")
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_platform_audit_entry_correlation"
        ON "platform_audit_entry" ("correlationId")
        WHERE "correlationId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ix_platform_audit_entry_correlation"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ix_platform_audit_entry_subject_category_rowid"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ix_platform_audit_entry_subject_category_created"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_audit_entry"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "platform_audit_initiator_role"`
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "platform_audit_outcome"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "platform_audit_category"`);
  }
}
