import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `content_metadata` JSONB column to the `file` table.
 *
 * Companion to file-service-go v0.0.17 (alkem-io/file-service-go#19),
 * which canonicalizes image bytes (physical EXIF rotation, profile-
 * preserving metadata strip) and surfaces post-rotation pixel
 * dimensions on every metadata-returning response. Those dims are
 * cached on the file row in this column so subsequent reads (copy,
 * patch, dedup-reuse) can return them without re-decoding the blob.
 *
 * JSONB rather than two top-level integer columns: `file` is a
 * generic store for PDFs, video, archives, etc. — image dims are the
 * first content-type-specific property landing here, and the next
 * (video duration / codec, PDF page count, etc.) will use the same
 * column. Forward-fit without further DDL.
 *
 * Default `'{}'::jsonb`: legacy rows coexist with new ones; the Go
 * service lazy-backfills empty `content_metadata` on first metadata-
 * returning read via a header-only decode path. Cold rows nobody
 * accesses never backfill — that's fine, they don't need to.
 *
 * Rollback note: down() drops the column. Cached metadata is
 * derivable from the underlying blob, so dropping is non-destructive
 * (file-service-go falls back to lazy-decode whenever
 * content_metadata is absent).
 */
export class AddContentMetadataToFile1778198400000 implements MigrationInterface {
  name = 'AddContentMetadataToFile1778198400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" ADD COLUMN "content_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" DROP COLUMN "content_metadata"`
    );
  }
}
