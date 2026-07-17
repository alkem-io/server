import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the per-conversation storage relation and backfills it for pre-existing
 * conversations (feature 013-matrix-media-file-service, tasks T004 schema +
 * T006 backfill).
 *
 * New conversations get their StorageAggregator + bucket eagerly in
 * ConversationService.createConversation; this migration covers the schema
 * (`conversation.storageAggregatorId`) and creates the aggregator + directStorage
 * bucket + authorization rows for every conversation that predates the feature,
 * so attachments work in older conversations too.
 *
 * The backfilled authorization policies start empty; the membership-mirrored
 * READ/FILE_UPLOAD rules are (re)applied by the standard conversation
 * authorization reset (ConversationAuthorizationService.applyAuthorizationPolicy)
 * the next time it runs — the same pattern other backfill migrations rely on.
 */
export class ConversationStorageAggregator1782300000002
  implements MigrationInterface
{
  name = 'ConversationStorageAggregator1782300000002';

  private readonly maxFileSize = 52428800; // 50 MiB

  // MUST stay identical to CONVERSATION_MEDIA_ALLOWED_MIME_TYPES in
  // src/common/enums/mime.file.type.ts (the runtime constant applied to
  // new-conversation buckets in ConversationService). Backfilled buckets and
  // new-conversation buckets must end up with the same policy, otherwise an
  // identical upload succeeds in a new conversation but is rejected in a
  // backfilled one. Inlined (not imported) to keep this migration a
  // self-contained, immutable snapshot per repo convention. Order is
  // irrelevant (membership is a simple-array `includes` check); the SET must
  // match: visual (excl. SVG) + audio/video + documents.
  private readonly allowedMimeTypes = [
    // Visual (image/svg+xml intentionally excluded — SVG can carry active
    // content, so it is not accepted for member-to-member upload).
    'image/bmp',
    'image/jpg',
    'image/jpeg',
    'image/x-png',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
    // Audio / video.
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    // Documents (full office set — must match MimeTypeDocument).
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    'text/calendar',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.template',
    'application/vnd.ms-powerpoint.template.macroEnabled.12',
    'application/vnd.oasis.opendocument.graphics',
  ].join(',');

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Schema: nullable FK column (OneToOne -> unique) to storage_aggregator.
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "storageAggregatorId" uuid`
    );
    // PostgreSQL has no `ADD CONSTRAINT IF NOT EXISTS`, so guard each constraint
    // with a `pg_constraint` lookup to keep a partial re-run idempotent.
    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'UQ_conversation_storageAggregatorId'
         ) THEN
           ALTER TABLE "conversation" ADD CONSTRAINT "UQ_conversation_storageAggregatorId" UNIQUE ("storageAggregatorId");
         END IF;
       END $$;`
    );
    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'FK_conversation_storageAggregatorId'
         ) THEN
           ALTER TABLE "conversation" ADD CONSTRAINT "FK_conversation_storageAggregatorId" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
         END IF;
       END $$;`
    );

    // 2. Backfill for pre-existing conversations.
    const platform: { storageAggregatorId: string }[] =
      await queryRunner.query(
        `SELECT "storageAggregatorId" FROM platform LIMIT 1`
      );
    const platformStorageAggregatorId = platform?.[0]?.storageAggregatorId;
    if (!platformStorageAggregatorId) {
      throw new Error(
        'ConversationStorageAggregator: platform StorageAggregator not found'
      );
    }

    const conversations: { id: string }[] = await queryRunner.query(
      `SELECT id FROM conversation WHERE "storageAggregatorId" IS NULL`
    );

    // Best-effort sequential backfill: conversations are processed one at a time.
    // The whole migration runs in TypeORM's transaction, so it is atomic; on a
    // partial re-run the `WHERE storageAggregatorId IS NULL` filter skips already
    // backfilled conversations, and the `ON CONFLICT DO NOTHING` guards below keep
    // re-inserts harmless even if a future run is executed non-transactionally.
    //
    // FIX 11 (kept sequential, deliberately): each conversation needs a 5-step
    // cross-table chain with generated UUIDs and FK ordering (2 auth rows →
    // aggregator → bucket → aggregator.directStorageId update → conversation
    // update). Batching into multi-row INSERTs would tangle that ordering for
    // marginal benefit on a ONE-TIME backfill; the single-transaction lock cost
    // is acceptable given the bounded, one-off conversation set.
    for (const conversation of conversations) {
      const aggregatorAuthId = randomUUID();
      const bucketAuthId = randomUUID();
      const aggregatorId = randomUUID();
      const bucketId = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
         VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-aggregator')
         ON CONFLICT (id) DO NOTHING`,
        [aggregatorAuthId]
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
         VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-bucket')
         ON CONFLICT (id) DO NOTHING`,
        [bucketAuthId]
      );

      // Aggregator first (directStorageId set after the bucket exists, to avoid
      // the circular FK), parented to the platform aggregator.
      await queryRunner.query(
        `INSERT INTO storage_aggregator (id, "createdDate", "updatedDate", version, "authorizationId", type, "parentStorageAggregatorId")
         VALUES ($1, NOW(), NOW(), 1, $2, 'conversation', $3)
         ON CONFLICT (id) DO NOTHING`,
        [aggregatorId, aggregatorAuthId, platformStorageAggregatorId]
      );
      await queryRunner.query(
        `INSERT INTO storage_bucket (id, "createdDate", "updatedDate", version, "authorizationId", "allowedMimeTypes", "maxFileSize", "storageAggregatorId")
         VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [bucketId, bucketAuthId, this.allowedMimeTypes, this.maxFileSize, aggregatorId]
      );
      await queryRunner.query(
        `UPDATE storage_aggregator SET "directStorageId" = $1 WHERE id = $2`,
        [bucketId, aggregatorId]
      );
      await queryRunner.query(
        `UPDATE conversation SET "storageAggregatorId" = $1 WHERE id = $2`,
        [aggregatorId, conversation.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Release backfilled storage for conversations, then drop the column.
    const rows: {
      storageAggregatorId: string;
      directStorageId: string | null;
      aggregatorAuthId: string;
      bucketAuthId: string | null;
    }[] = await queryRunner.query(
      `SELECT c."storageAggregatorId"            AS "storageAggregatorId",
              sa."directStorageId"               AS "directStorageId",
              sa."authorizationId"               AS "aggregatorAuthId",
              sb."authorizationId"               AS "bucketAuthId"
       FROM conversation c
       JOIN storage_aggregator sa ON sa.id = c."storageAggregatorId"
       LEFT JOIN storage_bucket sb ON sb.id = sa."directStorageId"
       WHERE c."storageAggregatorId" IS NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_storageAggregatorId"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "UQ_conversation_storageAggregatorId"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN IF EXISTS "storageAggregatorId"`
    );

    for (const row of rows) {
      if (row.directStorageId) {
        await queryRunner.query(`DELETE FROM storage_bucket WHERE id = $1`, [
          row.directStorageId,
        ]);
      }
      await queryRunner.query(`DELETE FROM storage_aggregator WHERE id = $1`, [
        row.storageAggregatorId,
      ]);
      if (row.bucketAuthId) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = $1`,
          [row.bucketAuthId]
        );
      }
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = $1`, [
        row.aggregatorAuthId,
      ]);
    }
  }
}
