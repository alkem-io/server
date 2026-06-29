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

  private readonly allowedMimeTypes = [
    'image/bmp',
    'image/jpg',
    'image/jpeg',
    'image/x-png',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/heic',
    'image/heif',
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
    'application/pdf',
  ].join(',');

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Schema: nullable FK column (OneToOne -> unique) to storage_aggregator.
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "storageAggregatorId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "UQ_conversation_storageAggregatorId" UNIQUE ("storageAggregatorId")`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_conversation_storageAggregatorId" FOREIGN KEY ("storageAggregatorId") REFERENCES "storage_aggregator"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
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

    for (const conversation of conversations) {
      const aggregatorAuthId = randomUUID();
      const bucketAuthId = randomUUID();
      const aggregatorId = randomUUID();
      const bucketId = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
         VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-aggregator')`,
        [aggregatorAuthId]
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
         VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-bucket')`,
        [bucketAuthId]
      );

      // Aggregator first (directStorageId set after the bucket exists, to avoid
      // the circular FK), parented to the platform aggregator.
      await queryRunner.query(
        `INSERT INTO storage_aggregator (id, "createdDate", "updatedDate", version, "authorizationId", type, "parentStorageAggregatorId")
         VALUES ($1, NOW(), NOW(), 1, $2, 'conversation', $3)`,
        [aggregatorId, aggregatorAuthId, platformStorageAggregatorId]
      );
      await queryRunner.query(
        `INSERT INTO storage_bucket (id, "createdDate", "updatedDate", version, "authorizationId", "allowedMimeTypes", "maxFileSize", "storageAggregatorId")
         VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5)`,
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
