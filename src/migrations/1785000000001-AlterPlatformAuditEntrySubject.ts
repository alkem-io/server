import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#027-platform-role-redesign (research D13, T015): the ONE table
 * change this feature spends.
 *
 * - `subjectUserId` → nullable: a role grant to an ORGANIZATION (FR-026) has
 *   no subject user. This also retires the `PlatformOperationsAuditService`
 *   actor-in-both-columns placeholder (T025) — with the constraint relaxed,
 *   a category writes the real subject or none, which is what makes the
 *   derived self-affecting predicate (FR-015/FR-030, SC-015) trustworthy.
 * - `subjectOrganizationId` (new, nullable uuid) — the organization-target
 *   counterpart. At most one of the two is non-null per row, enforced at the
 *   service layer (T026), not by a CHECK constraint.
 * - one partial index mirroring the existing subject+category+created one,
 *   scoped to organization-subject rows.
 *
 * Existing rows and the two `subjectUserId`-leading indexes are untouched.
 */
export class AlterPlatformAuditEntrySubject1785000000001
  implements MigrationInterface
{
  name = 'AlterPlatformAuditEntrySubject1785000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "platform_audit_entry" ALTER COLUMN "subjectUserId" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_audit_entry" ADD COLUMN "subjectOrganizationId" uuid NULL`
    );
    await queryRunner.query(`
      CREATE INDEX "ix_platform_audit_entry_subject_org_category_created"
        ON "platform_audit_entry" ("subjectOrganizationId", "category", "createdDate")
        WHERE "subjectOrganizationId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ix_platform_audit_entry_subject_org_category_created"`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_audit_entry" DROP COLUMN IF EXISTS "subjectOrganizationId"`
    );
    // Restoring NOT NULL on subjectUserId is deliberately NOT attempted here:
    // by the time this migration might be reverted, rows written with a null
    // subjectUserId (organization-subject grants) may already exist, and a
    // blind ALTER ... SET NOT NULL would fail or destroy data. Reverting
    // requires an operator decision, not an automatic rollback.
  }
}
