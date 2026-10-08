import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off cleanup of the backlog described in alkem-io/server#6614.
 *
 * Deletes, in order:
 *   1. classifications, licenses and profiles that nothing names — what the
 *      callout delete, the space delete and the L1→L0 conversion left behind;
 *   2. the locations and storage buckets owned by the profiles deleted in 1;
 *   3. every authorization policy that nothing names, including the ones
 *      freed by 1–2.
 *
 * A row is kept while anything names it: any foreign key, or any column that
 * carries the row's id under the conventional name (migration backup tables
 * hold such columns without a foreign key). The only exceptions are the row's
 * own children listed in CHILDREN, which Postgres deletes with it. An
 * unexpected reference therefore keeps the row; it is never guessed away.
 *
 * Buckets and locations are only deleted when a profile deleted here owned
 * them. Others can be named outside the database: the Matrix media staging
 * bucket is named only from configuration
 * (storage.file_service.matrix_media_bucket_id).
 *
 * Files are never deleted: their content lives in file-service storage, which
 * only file-service may release. A profile whose bucket still holds files is
 * left whole and counted, for a cleanup that goes through file-service.
 *
 * Only rows older than a day are touched, so a create that is still in flight
 * (children are saved before their parent) cannot lose a child.
 *
 * Irreversible: down() restores nothing.
 */
const CUTOFF = `now() - interval '1 day'`;

const CHILDREN: Record<string, string[]> = {
  classification: ['tagset.classificationId'],
  license: ['license_entitlement.licenseId'],
  profile: ['reference.profileId', 'tagset.profileId', 'visual.profileId'],
};

const PROFILE_BUCKET_HOLDS_FILES =
  'EXISTS (SELECT 1 FROM "file" f WHERE f."storageBucketId" = t."storageBucketId")';

type Reference = { table: string; column: string };
type DeletedProfile = {
  locationId: string | null;
  storageBucketId: string | null;
};

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

export class CleanUpOrphanedRecordsAndPolicies1790800000000
  implements MigrationInterface
{
  name = 'CleanUpOrphanedRecordsAndPolicies1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, idColumn] of [
      ['classification', 'classificationId'],
      ['license', 'licenseId'],
    ]) {
      await this.delete(queryRunner, table, [
        await this.unnamed(queryRunner, table, idColumn),
      ]);
    }

    const unnamedProfile = await this.unnamed(
      queryRunner,
      'profile',
      'profileId'
    );
    const [{ count: profilesWithFiles }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "profile" t
       WHERE t."createdDate" < ${CUTOFF} AND ${unnamedProfile} AND ${PROFILE_BUCKET_HOLDS_FILES}`
    );
    console.log(
      `[Migration] Left ${profilesWithFiles} unowned profile trees whose bucket holds files (need file-service)`
    );
    const profiles: DeletedProfile[] = await this.delete(
      queryRunner,
      'profile',
      [unnamedProfile, `NOT ${PROFILE_BUCKET_HOLDS_FILES}`]
    );

    const ownedBy = (key: keyof DeletedProfile) =>
      profiles
        .map(profile => profile[key])
        .filter((id): id is string => id !== null);
    await this.delete(
      queryRunner,
      'location',
      [await this.unnamed(queryRunner, 'location', 'locationId'), 't.id = ANY($1)'],
      [ownedBy('locationId')]
    );
    await this.delete(
      queryRunner,
      'storage_bucket',
      [
        await this.unnamed(queryRunner, 'storage_bucket', 'storageBucketId'),
        't.id = ANY($1)',
      ],
      [ownedBy('storageBucketId')]
    );

    await this.delete(queryRunner, 'authorization_policy', [
      await this.unnamed(queryRunner, 'authorization_policy', 'authorizationId'),
    ]);
  }

  public async down(): Promise<void> {
    console.log(
      '[Migration] CleanUpOrphanedRecordsAndPolicies: deleted rows cannot be restored'
    );
  }

  /** Deletes the rows of `table` (aliased `t`) older than the cutoff that match every condition. */
  private async delete(
    queryRunner: QueryRunner,
    table: string,
    conditions: string[],
    parameters: unknown[] = []
  ): Promise<any[]> {
    const deleted = await queryRunner.query(
      `WITH deleted AS (
         DELETE FROM ${quote(table)} t
         WHERE t."createdDate" < ${CUTOFF} AND ${conditions.join(' AND ')}
         RETURNING t.*
       ) SELECT * FROM deleted`,
      parameters
    );
    console.log(`[Migration] Deleted ${deleted.length} unowned ${table} rows`);
    return deleted;
  }

  /** SQL true for a row of `table` (aliased `t`) that nothing but its own children names. */
  private async unnamed(
    queryRunner: QueryRunner,
    table: string,
    idColumn: string
  ): Promise<string> {
    const references: Reference[] = await queryRunner.query(
      `SELECT format('%I.%I', n.nspname, c.relname) AS "table", a.attname AS "column"
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
       WHERE con.contype = 'f' AND con.confrelid = $1::regclass
         AND NOT (n.nspname = current_schema() AND c.relname || '.' || a.attname = ANY($3))
       UNION
       SELECT format('%I.%I', table_schema, table_name), column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND column_name = $2
         AND NOT (table_name || '.' || column_name = ANY($3))`,
      [table, idColumn, CHILDREN[table] ?? []]
    );
    // Nothing naming the table at all would make every row "unowned"; that is
    // a catalog misread, never a reason to empty it.
    if (references.length === 0) {
      throw new Error(`No references found for ${table}`);
    }
    const names = references
      .map(
        ({ table: source, column }) =>
          `SELECT ${quote(column)} AS id FROM ${source} WHERE ${quote(column)} IS NOT NULL`
      )
      .join(' UNION ALL ');
    return `NOT EXISTS (SELECT 1 FROM (${names}) r WHERE r.id = t.id)`;
  }
}
