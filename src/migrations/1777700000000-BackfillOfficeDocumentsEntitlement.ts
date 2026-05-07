import { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained constants — the migration must not import from
// src/common/enums so future enum edits never change history.
const ENTITLEMENT_TYPE = 'space-flag-office-documents';
const ENTITLEMENT_DATA_TYPE = 'flag';

// Per-license-type seed values mirror the create-time defaults in
// SpaceService.createLicenseForSpaceL0, CollaborationService and
// TemplateContentSpaceService at the time PR #5967 shipped:
//   space                  -> enabled=true  (later rewritten by SpaceLicenseService.applyLicensePolicy)
//   collaboration          -> enabled=false (later copied from parent Space license)
//   template_content_space -> enabled=true  (templates do not run applyLicensePolicy; value is durable)
const BACKFILL_TARGETS: Array<{ licenseType: string; enabled: boolean }> = [
  { licenseType: 'space', enabled: true },
  { licenseType: 'collaboration', enabled: false },
  { licenseType: 'template_content_space', enabled: true },
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
