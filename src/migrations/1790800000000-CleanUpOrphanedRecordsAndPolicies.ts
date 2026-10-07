import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off cleanup of the backlog described in alkem-io/server#6614.
 *
 * Deletes, in order:
 *   1. classifications, licenses and profiles that no record owns — what the
 *      callout delete, the space delete and the L1→L0 conversion left behind;
 *   2. the locations and empty storage buckets those profiles owned;
 *   3. every authorization policy that nothing references, including the ones
 *      freed by steps 1–2.
 *
 * "Owned" is read from the catalog, not hard-coded: a row is kept while any
 * foreign key that does NOT cascade on delete references it (the owner side of
 * a one-to-one, or any other reference). Foreign keys that DO cascade belong
 * to the row's own children (tagsets, references, visuals, entitlements), which
 * Postgres removes with it.
 *
 * Files are never deleted here: their content lives in file-service storage,
 * which only file-service may release. A storage bucket that still holds files
 * is left in place and counted, for a cleanup that goes through file-service.
 *
 * Only rows older than a day are touched, so a create that is still in flight
 * (children are saved before their parent) cannot lose a child.
 *
 * Irreversible: down() restores nothing.
 */
const CUTOFF = `now() - interval '1 day'`;
const HOLDS_FILES =
  'EXISTS (SELECT 1 FROM "file" f WHERE f."storageBucketId" = t.id)';

type Reference = { table: string; column: string };

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

export class CleanUpOrphanedRecordsAndPolicies1790800000000
  implements MigrationInterface
{
  name = 'CleanUpOrphanedRecordsAndPolicies1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['classification', 'license', 'profile', 'location']) {
      await this.deleteUnowned(queryRunner, table);
    }
    await this.deleteUnowned(queryRunner, 'storage_bucket', `NOT ${HOLDS_FILES}`);

    const [{ count: bucketsWithFiles }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "storage_bucket" t
       WHERE ${await this.unowned(queryRunner, 'storage_bucket')} AND ${HOLDS_FILES}`
    );
    console.log(
      `[Migration] Left ${bucketsWithFiles} unowned storage_bucket rows that still hold files (need file-service)`
    );

    await this.deleteUnreferencedPolicies(queryRunner);
  }

  public async down(): Promise<void> {
    console.log(
      '[Migration] CleanUpOrphanedRecordsAndPolicies: deleted rows cannot be restored'
    );
  }

  private async deleteUnowned(
    queryRunner: QueryRunner,
    table: string,
    extraCondition = 'TRUE'
  ): Promise<void> {
    const [{ count }] = await queryRunner.query(
      `WITH deleted AS (
         DELETE FROM ${quote(table)} t
         WHERE t."createdDate" < ${CUTOFF}
           AND ${await this.unowned(queryRunner, table)}
           AND ${extraCondition}
         RETURNING 1
       ) SELECT count(*)::int AS count FROM deleted`
    );
    console.log(`[Migration] Deleted ${count} unowned ${table} rows`);
  }

  /** SQL true for a row of `table` (aliased `t`) that no non-cascading foreign key references. */
  private async unowned(
    queryRunner: QueryRunner,
    table: string
  ): Promise<string> {
    const references: Reference[] = await queryRunner.query(
      `SELECT src.relname AS "table", att.attname AS "column"
       FROM pg_constraint con
       JOIN pg_class src ON src.oid = con.conrelid
       JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
       WHERE con.contype = 'f' AND con.confrelid = $1::regclass AND con.confdeltype <> 'c'`,
      [table]
    );
    // No owner at all would make every row "unowned"; that is a catalog
    // misread, never a reason to empty the table.
    if (references.length === 0) {
      throw new Error(`No owning foreign keys found for ${table}`);
    }
    return references
      .map(
        ({ table: src, column }) =>
          `NOT EXISTS (SELECT 1 FROM ${quote(src)} r WHERE r.${quote(column)} = t.id)`
      )
      .join(' AND ');
  }

  private async deleteUnreferencedPolicies(
    queryRunner: QueryRunner
  ): Promise<void> {
    // Every foreign key to authorization_policy, plus any "authorizationId"
    // column without one (migration backup tables), counts as a reference.
    const references: Reference[] = await queryRunner.query(
      `SELECT src.relname AS "table", att.attname AS "column"
       FROM pg_constraint con
       JOIN pg_class src ON src.oid = con.conrelid
       JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
       WHERE con.contype = 'f' AND con.confrelid = 'authorization_policy'::regclass
       UNION
       SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND column_name = 'authorizationId'`
    );
    if (references.length === 0) {
      throw new Error('No references to authorization_policy found');
    }
    const used = references
      .map(
        ({ table, column }) =>
          `SELECT ${quote(column)} AS id FROM ${quote(table)} WHERE ${quote(column)} IS NOT NULL`
      )
      .join(' UNION ALL ');
    const [{ count }] = await queryRunner.query(
      `WITH used AS (${used}),
       deleted AS (
         DELETE FROM "authorization_policy" p
         WHERE p."createdDate" < ${CUTOFF}
           AND NOT EXISTS (SELECT 1 FROM used u WHERE u.id = p.id)
         RETURNING 1
       ) SELECT count(*)::int AS count FROM deleted`
    );
    console.log(
      `[Migration] Deleted ${count} unreferenced authorization_policy rows`
    );
  }
}
