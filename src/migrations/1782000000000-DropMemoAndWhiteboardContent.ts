import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the inline collaborative-content columns `memo.content` (`bytea`,
 * Yjs-V2) and `whiteboard.content` (`text`, Excalidraw JSON, gzip) — the
 * breaking storage cutover of 006-collab-content-unification (R2/FR-005/SC-004).
 *
 * Collaborative document content now lives ONLY as a Yjs-V2 snapshot in each
 * document's OWN storage bucket (located by `contentPointer`), counting toward
 * the space's storage quota. The whiteboard `@BeforeInsert/@BeforeUpdate`
 * compression and `@AfterLoad` decompression hooks are removed in the entity
 * alongside this column drop.
 *
 * ORDERING (DEC-6, plan §4): the up-front batch migration
 * (`CollaborationMigrationService.migrateAll`) MUST run BEFORE this migration in
 * production — it moves every legacy document's content into its bucket and sets
 * `contentPointer`. This migration only removes the now-unused columns.
 *
 * Reversible: `down()` re-adds the columns with their original types so the
 * schema shape is restored. The dropped DATA is not (and cannot be) restored —
 * by cutover it lives in file storage; a true rollback would re-hydrate from the
 * snapshots, which is an operational task, not a schema migration. `whiteboard.content`
 * was originally `NOT NULL` (entity default `''`); it is restored as
 * `NOT NULL DEFAULT ''` then the default is dropped to match the original shape.
 */
export class DropMemoAndWhiteboardContent1782000000000
  implements MigrationInterface
{
  name = 'DropMemoAndWhiteboardContent1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "content"`);
    await queryRunner.query(`ALTER TABLE "whiteboard" DROP COLUMN "content"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // memo.content was a nullable bytea.
    await queryRunner.query(`ALTER TABLE "memo" ADD "content" bytea`);
    // whiteboard.content was text NOT NULL (no DB default; the entity set '').
    // Re-add with a transient default so the NOT NULL constraint holds for any
    // existing rows, then drop the default to match the original column shape.
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ADD "content" text NOT NULL DEFAULT ''`
    );
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ALTER COLUMN "content" DROP DEFAULT`
    );
  }
}
