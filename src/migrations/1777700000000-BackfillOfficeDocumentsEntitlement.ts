import { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained constants — the migration must not import from
// src/common/enums so future enum edits never change history.
const ENTITLEMENT_TYPE = 'space-flag-office-documents';
const ENTITLEMENT_DATA_TYPE = 'flag';

// Per-license-type seed values mirror the create-time defaults in
// SpaceService.createLicenseForSpaceL0 and CollaborationService at the time
// PR #5967 shipped. TEMPLATE_CONTENT_SPACE is intentionally omitted:
// template_content_space has no persisted license (no licenseId column on the
// table) — TemplateContentSpaceLicenseService rebuilds a transient license
// from code on every applyLicensePolicy, so there is nothing to backfill.
const BACKFILL_TARGETS: Array<{ licenseType: string; enabled: boolean }> = [
  { licenseType: 'space', enabled: false },
  { licenseType: 'collaboration', enabled: false },
];

export class BackfillOfficeDocumentsEntitlement1777700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { licenseType, enabled } of BACKFILL_TARGETS) {
      await queryRunner.query(
        `INSERT INTO license_entitlement
           (id, "createdDate", "updatedDate", version,
            type, "dataType", "limit", enabled, "licenseId")
         SELECT
           uuid_generate_v4(), NOW(), NOW(), 1,
           $1::varchar, $2::varchar, 0, $3, l.id
         FROM license l
         WHERE l.type = $4::varchar
           AND NOT EXISTS (
             SELECT 1 FROM license_entitlement le
             WHERE le."licenseId" = l.id
               AND le.type = $1::varchar
           )`,
        [ENTITLEMENT_TYPE, ENTITLEMENT_DATA_TYPE, enabled, licenseType]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Removes every license_entitlement row of this type. Safe: the type was
    // introduced by PR #5967, so no pre-existing rows can match.
    await queryRunner.query(
      `DELETE FROM license_entitlement WHERE type = $1`,
      [ENTITLEMENT_TYPE]
    );
  }
}
