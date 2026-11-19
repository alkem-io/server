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
 * Every deleted row is first copied, whole, into _orphan_cleanup_backup_<table>
 * in the same statement as the delete: the row itself, the children Postgres
 * deletes with it, and every reference to it that Postgres nulls. The backups
 * are kept until the fix is confirmed; down() restores the rows exactly and
 * drops them. The backups are not counted as names, or the copies would keep
 * the rows they copy.
 */
const CUTOFF = `now() - interval '1 day'`;

const CHILDREN: Record<string, string[]> = {
  classification: ['tagset.classificationId'],
  license: ['license_entitlement.licenseId'],
  profile: ['reference.profileId', 'tagset.profileId', 'visual.profileId'],
};

const BACKUP_PREFIX = '_orphan_cleanup_backup_';
const NULLED_REFERENCES = `${BACKUP_PREFIX}nulled_references`;

// Parents before the rows that point at them, so down() can insert in order.
const RESTORE_ORDER = [
  'authorization_policy',
  'location',
  'storage_bucket',
  'license',
  'classification',
  'profile',
  'license_entitlement',
  'tagset',
  'reference',
  'visual',
];

const PROFILE_BUCKET_HOLDS_FILES =
  'EXISTS (SELECT 1 FROM "file" f WHERE f."storageBucketId" = t."storageBucketId")';

type Reference = { table: string; column: string };
type Dependent = Reference & { name: string; local: boolean };
type DeletedProfile = {
  locationId: string | null;
  storageBucketId: string | null;
};

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const isChild = (table: string, { local, name, column }: Dependent) =>
  local && (CHILDREN[table]?.includes(`${name}.${column}`) ?? false);

// pg_constraint.confdeltype: no action, restrict, cascade, set null, set default.
const ANY_DELETE_RULE = ['a', 'r', 'c', 'n', 'd'];

export class CleanUpOrphanedRecordsAndPolicies1790800000000
  implements MigrationInterface
{
  name = 'CleanUpOrphanedRecordsAndPolicies1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ${quote(NULLED_REFERENCES)}
         ("table" text NOT NULL, "column" text NOT NULL, "id" uuid NOT NULL, "value" uuid NOT NULL)`
    );
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
      [unnamedProfile, `NOT ${PROFILE_BUCKET_HOLDS_FILES}`],
      [],
      '"locationId", "storageBucketId"'
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of RESTORE_ORDER) {
      const backup = `${BACKUP_PREFIX}${table}`;
      if (!(await this.exists(queryRunner, backup))) continue;
      const columns: { name: string }[] = await queryRunner.query(
        `SELECT column_name AS name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1
         ORDER BY ordinal_position`,
        [backup]
      );
      const list = columns.map(({ name }) => quote(name)).join(', ');
      const restored = await queryRunner.query(
        `WITH restored AS (
           INSERT INTO ${quote(table)} (${list}) SELECT ${list} FROM ${quote(backup)}
           RETURNING 1
         ) SELECT count(*)::int AS count FROM restored`
      );
      console.log(`[Migration] Restored ${restored[0].count} ${table} rows`);
    }

    if (await this.exists(queryRunner, NULLED_REFERENCES)) {
      const nulled: Reference[] = await queryRunner.query(
        `SELECT DISTINCT "table", "column" FROM ${quote(NULLED_REFERENCES)}`
      );
      // Only a reference still null is restored; one set since is kept.
      for (const { table, column } of nulled) {
        await queryRunner.query(
          `UPDATE ${table} s SET ${quote(column)} = n."value"
           FROM ${quote(NULLED_REFERENCES)} n
           WHERE n."table" = $1 AND n."column" = $2 AND s.id = n."id"
             AND s.${quote(column)} IS NULL`,
          [table, column]
        );
      }
    }

    for (const table of [...RESTORE_ORDER, 'nulled_references']) {
      await queryRunner.query(
        `DROP TABLE IF EXISTS ${quote(`${BACKUP_PREFIX}${table}`)}`
      );
    }
  }

  /**
   * Deletes the rows of `table` (aliased `t`) older than the cutoff that match
   * every condition, returning only the `returning` columns — not whole rows,
   * which for policies would pull kilobytes of rule JSON each into memory.
   *
   * The same statement copies the rows, the children their delete cascades
   * to, and the references it nulls into the backup tables. Every part of one
   * statement reads the same snapshot, taken before any row is deleted.
   */
  private async delete(
    queryRunner: QueryRunner,
    table: string,
    conditions: string[],
    parameters: unknown[] = [],
    returning = 'id'
  ): Promise<any[]> {
    const children = (await this.dependents(queryRunner, table, ['c'])).filter(
      dependent => isChild(table, dependent)
    );
    const parts = [
      `deleted AS (
         DELETE FROM ${quote(table)} t
         WHERE t."createdDate" < ${CUTOFF} AND ${conditions.join(' AND ')}
         RETURNING t.*
       )`,
      `saved AS (INSERT INTO ${await this.backup(queryRunner, table)} SELECT * FROM deleted)`,
      ...(await this.saveNulled(queryRunner, table, 'deleted')),
    ];
    for (const [index, child] of children.entries()) {
      // A grandchild would go with the child, unsaved.
      if ((await this.dependents(queryRunner, child.name, ['c'])).length > 0) {
        throw new Error(`${child.name} has cascading children of its own`);
      }
      const saved = `child_${index}`;
      parts.push(
        `${saved} AS (
           INSERT INTO ${await this.backup(queryRunner, child.name)}
           SELECT c.* FROM ${child.table} c
           WHERE c.${quote(child.column)} IN (SELECT id FROM deleted)
           RETURNING id
         )`,
        ...(await this.saveNulled(queryRunner, child.name, saved))
      );
    }
    const deleted = await queryRunner.query(
      `WITH ${parts.join(',\n')} SELECT ${returning} FROM deleted`,
      parameters
    );
    console.log(
      `[Migration] Deleted ${deleted.length} unowned ${table} rows (backed up in ${BACKUP_PREFIX}${table})`
    );
    return deleted;
  }

  /** Creates the backup table of `table` if missing; returns its quoted name. */
  private async backup(queryRunner: QueryRunner, table: string): Promise<string> {
    // down() restores and drops only what RESTORE_ORDER lists.
    if (!RESTORE_ORDER.includes(table)) {
      throw new Error(`${table} is backed up but missing from RESTORE_ORDER`);
    }
    const backup = quote(`${BACKUP_PREFIX}${table}`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ${backup} AS SELECT * FROM ${quote(table)} WITH NO DATA`
    );
    return backup;
  }

  /** CTE parts that record each reference Postgres nulls when the `ids` rows of `table` go. */
  private async saveNulled(
    queryRunner: QueryRunner,
    table: string,
    ids: string
  ): Promise<string[]> {
    const nulled = await this.dependents(queryRunner, table, ['n', 'd']);
    return nulled.map(
      ({ table: source, column }, index) =>
        `${ids}_nulled_${index} AS (
           INSERT INTO ${quote(NULLED_REFERENCES)} ("table", "column", "id", "value")
           SELECT ${literal(source)}, ${literal(column)}, s.id, s.${quote(column)}
           FROM ${source} s WHERE s.${quote(column)} IN (SELECT id FROM ${ids})
         )`
    );
  }

  /** The foreign keys onto `table` whose delete rule is one of `rules`. */
  private async dependents(
    queryRunner: QueryRunner,
    table: string,
    rules: string[]
  ): Promise<Dependent[]> {
    return queryRunner.query(
      `SELECT format('%I.%I', n.nspname, c.relname) AS "table", c.relname AS name,
              a.attname AS "column", n.nspname = current_schema() AS local
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
       WHERE con.contype = 'f' AND con.confrelid = $1::regclass
         AND con.confdeltype::text = ANY($2)`,
      [table, rules]
    );
  }

  private async exists(queryRunner: QueryRunner, table: string): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      'SELECT to_regclass($1) IS NOT NULL AS found',
      [quote(table)]
    );
    return found;
  }

  /** SQL true for a row of `table` (aliased `t`) that nothing but its own children names. */
  private async unnamed(
    queryRunner: QueryRunner,
    table: string,
    idColumn: string
  ): Promise<string> {
    const foreignKeys = (
      await this.dependents(queryRunner, table, ANY_DELETE_RULE)
    ).filter(dependent => !isChild(table, dependent));
    const conventional: Reference[] = await queryRunner.query(
      `SELECT format('%I.%I', table_schema, table_name) AS "table", column_name AS "column"
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND column_name = $1
         AND NOT (table_name || '.' || column_name = ANY($2))
         AND NOT starts_with(table_name, $3)`,
      [idColumn, CHILDREN[table] ?? [], BACKUP_PREFIX]
    );
    // A column that is both a foreign key and conventionally named is listed once.
    const references = [...foreignKeys, ...conventional].filter(
      (reference, index, all) =>
        all.findIndex(
          other =>
            other.table === reference.table && other.column === reference.column
        ) === index
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
