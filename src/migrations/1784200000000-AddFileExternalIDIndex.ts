import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileExternalIDIndex1784200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // file.externalID is the content hash. Two hot-path queries filter the file table by it and
    // currently sequential-scan (the table has only a PK on id):
    //   - the dedup lookup on every upload (WHERE "externalID" = $1 AND "storageBucketId" = $2)
    //   - the refcount check on every delete (SELECT COUNT(*) ... WHERE "externalID" = $1), which
    //     the continuous-backup outbox hygiene made load-bearing (it gates the blob GC + the
    //     pending-outbox-row cleanup).
    // A btree on ("externalID") serves both. It also lets the file-service dims-backfill sweep and
    // the CID re-key sweep scan the corpus cheaply. Idempotent (IF NOT EXISTS) so it is safe on an
    // environment where the index was already built by hand (e.g. CONCURRENTLY in a window).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")`
    );
    await queryRunner.query(`ANALYZE "file"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_file_externalID"`);
  }
}
