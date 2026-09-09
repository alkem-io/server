import { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained constants — the migration must not import from
// src/common/enums so future enum edits never change history.
const ENTITLEMENT_TYPE = 'space-flag-memo-signing';
const ENTITLEMENT_DATA_TYPE = 'flag';

const BACKFILL_TARGETS: Array<{ licenseType: string; enabled: boolean }> = [
  { licenseType: 'space', enabled: false },
  { licenseType: 'collaboration', enabled: false },
];

export class BackfillMemoSigningEntitlement1788947200100
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
    // Removes every feature-owned entitlement row. Template-content-space
    // licenses are transient, so they have no persisted rows to backfill.
    await queryRunner.query(
      `DELETE FROM license_entitlement WHERE type = $1`,
      [ENTITLEMENT_TYPE]
    );
  }
}
