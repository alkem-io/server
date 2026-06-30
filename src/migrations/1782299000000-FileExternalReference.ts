import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the opaque, indexed `externalReference` column to the shared `file`
 * table (feature 013-matrix-media-file-service).
 *
 * WHY THIS LIVES HERE (and not in file-service):
 * The `file` table schema is owned by the server's TypeORM migrations — the
 * infra `server-migration` cron runs `pnpm run migration:run`. file-service has
 * NO migration runner: its `db/schema` / `db/migrations` are sqlc / local-only
 * and are never applied to any deployed environment. So the canonical DDL for
 * `externalReference` (file-service's `db/migrations/013_add_external_reference.sql`)
 * MUST be reproduced as a server migration, or the column simply never exists in
 * a deployed database and file-service's create / copy / PATCH / by-reference
 * paths — the core of feature 013 — fail at runtime.
 *
 * `externalReference` is an OPAQUE caller-supplied reference (e.g. a Synapse
 * media_id for Matrix media); neither the server nor file-service parses it. It
 * is distinct from `externalID` (the SHA3-256 content hash / blob key). The
 * column is nullable, so the change is additive and backward-compatible: every
 * existing row and every existing caller is unaffected.
 *
 * INDEXES (mirror file-service's 013_add_external_reference.sql):
 *   - UQ_file_externalReference_storageBucketId — at most one row per
 *     (reference, bucket). The same reference may recur across buckets (re-share,
 *     shared blob), so the index is PARTIAL (`WHERE externalReference IS NOT NULL`)
 *     and NULLs never collide.
 *   - IDX_file_externalReference — supports the global by-reference lookup
 *     (provider fetch resolving a reference across all buckets). Also partial.
 *
 * DELIBERATELY OMITTED — the partial UNIQUE("externalID", "storageBucketId")
 * `WHERE externalReference IS NULL`:
 * file-service's schema comments assume prod already has a
 * UNIQUE("externalID","storageBucketId") owned by the server that just needs to
 * be made partial. That assumption is FALSE for this server: the baseline
 * (1764590884532) created the `document`/`file` table with UNIQUE only on
 * `authorizationId` and `tagsetId` — there has NEVER been an
 * (externalID, storageBucketId) composite unique. Content dedup has always been
 * enforced at the application layer (file-service), not by a DB constraint.
 * Adding a fresh partial unique now would apply to ALL existing rows (every
 * legacy row has `externalReference IS NULL`); if prod already contains
 * duplicate (externalID, storageBucketId) pairs — entirely possible, since
 * nothing ever forbade them — the migration would HARD-FAIL. We therefore do not
 * introduce it and continue to rely on file-service's app-level dedup, matching
 * the actual production invariant.
 *
 * TRANSACTION HANDLING:
 * `CREATE INDEX CONCURRENTLY` (used to avoid a long ACCESS EXCLUSIVE write lock
 * on the large prod `file` table) cannot run inside a transaction block. This
 * repo runs migrations with the default `migrationsTransactionMode: 'all'`
 * (every pending migration shares ONE transaction), and the custom typeorm fork
 * REJECTS a per-migration `transaction = false` override under that mode. So we
 * use the established repo pattern (see 1780483789227-AddVirtualAssistantActorType):
 * COMMIT the framework's surrounding transaction, run the column + CONCURRENTLY
 * index statements in autocommit, then re-open a transaction for the framework to
 * continue and commit normally.
 *
 * IDEMPOTENT: `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX ... IF NOT EXISTS`, so a
 * partial apply or rerun is a safe no-op. (Partial CONCURRENTLY index builds
 * touch zero existing rows — every legacy row has `externalReference IS NULL` —
 * so they complete instantly and cannot fail on current prod data.)
 */
export class FileExternalReference1782299000000 implements MigrationInterface {
  name = 'FileExternalReference1782299000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Additive nullable column. Matches file-service db/schema/document.sql
    //    (`"externalReference" VARCHAR(256)`).
    await queryRunner.query(
      `ALTER TABLE "file" ADD COLUMN IF NOT EXISTS "externalReference" character varying(256)`
    );

    // 2. Leave the framework transaction so CONCURRENTLY can run (Postgres
    //    forbids CREATE INDEX CONCURRENTLY inside a transaction block). The
    //    column ADD above is committed by this call.
    await queryRunner.commitTransaction();

    // At most one row per (reference, bucket); partial so the column's NULLs
    // (all existing rows) never collide.
    await queryRunner.query(
      `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "UQ_file_externalReference_storageBucketId"
         ON "file" ("externalReference", "storageBucketId")
         WHERE "externalReference" IS NOT NULL`
    );

    // Supports the global by-reference lookup (provider fetch across all buckets).
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalReference"
         ON "file" ("externalReference")
         WHERE "externalReference" IS NOT NULL`
    );

    // 3. Re-open a transaction for the framework to record this migration and
    //    continue + commit normally.
    await queryRunner.startTransaction();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes CONCURRENTLY (also forbidden inside a transaction), then
    // drop the column. Same commit / re-open dance as up().
    await queryRunner.commitTransaction();

    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalReference"`
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "UQ_file_externalReference_storageBucketId"`
    );

    await queryRunner.startTransaction();

    await queryRunner.query(
      `ALTER TABLE "file" DROP COLUMN IF EXISTS "externalReference"`
    );
  }
}
