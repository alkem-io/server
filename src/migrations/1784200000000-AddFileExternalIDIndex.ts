import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileExternalIDIndex1784200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // file.externalID is the content hash. Two hot-path queries filter the file table by it and
    // currently sequential-scan (the table has only a PK on id):
    //   - the dedup lookup on every upload (WHERE "externalID" = $1 AND "storageBucketId" = $2)
    //   - the refcount check on every delete (SELECT COUNT(*) ... WHERE "externalID" = $1), which
    //     the continuous-backup outbox hygiene made load-bearing (it gates the blob GC + the
    //     pending-outbox-row cleanup).
    // A btree on ("externalID") serves both. It also lets the file-service dims-backfill sweep and
    // the CID re-key sweep scan the corpus cheaply.
    //
    // The production migration runner uses TypeORM's default transaction mode (`all`), while
    // PostgreSQL requires CREATE INDEX CONCURRENTLY to run outside a transaction. Temporarily end
    // the framework transaction using the repository's established migration pattern, then restore
    // it so TypeORM can continue normally. IF NOT EXISTS deliberately adopts a canonical index that
    // an operator may already have built by hand before rollout. A failed concurrent build can leave
    // an INVALID index behind; remove that unusable artifact first so a retry cannot falsely succeed.
    await this.runOutsideTransaction(queryRunner, async () => {
      const existingIndex: { isValid: boolean }[] = await queryRunner.query(`
        SELECT index_state.indisvalid AS "isValid"
        FROM pg_catalog.pg_index AS index_state
        INNER JOIN pg_catalog.pg_class AS index_class
          ON index_class.oid = index_state.indexrelid
        INNER JOIN pg_catalog.pg_namespace AS index_schema
          ON index_schema.oid = index_class.relnamespace
        WHERE index_schema.nspname = current_schema()
          AND index_class.relname = 'IDX_file_externalID'
      `);
      if (existingIndex.some(index => !index.isValid)) {
        await queryRunner.query(
          `DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalID"`
        );
      }

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")`
      );
      await queryRunner.query(`ANALYZE "file"`);
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Once up() adopts the canonical named index, this migration owns it. Rollback intentionally
    // removes that index even when it was pre-created manually. Drop concurrently for the same
    // availability reason as creation.
    await this.runOutsideTransaction(queryRunner, async () => {
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalID"`
      );
    });
  }

  private async runOutsideTransaction(
    queryRunner: QueryRunner,
    operation: () => Promise<void>
  ): Promise<void> {
    const hadActiveTransaction = queryRunner.isTransactionActive;
    if (hadActiveTransaction) {
      await queryRunner.commitTransaction();
    }

    try {
      await operation();
    } finally {
      // Restore the transaction expected by TypeORM's `all`/`each` executor, including when the
      // concurrent statement fails, so the executor can perform its normal error cleanup.
      if (hadActiveTransaction) {
        await queryRunner.startTransaction();
      }
    }
  }
}
