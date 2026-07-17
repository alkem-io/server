import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Provisions the reserved platform-level `matrix_media` staging StorageBucket
 * (feature 013-matrix-media-file-service, task T003).
 *
 * The Synapse media storage provider creates every inbound Matrix media in this
 * bucket first (it has no room context at upload time), with
 * `externalReference = media_id`. The server re-homes rows out of it on
 * `message.received` (MOVE into the conversation/comment bucket). It therefore
 * holds only uploaded-but-not-yet-referenced media — swept by the 24h staging
 * cleanup.
 *
 * Fixed/seeded id (MATRIX_MEDIA_STORAGE_BUCKET_ID) so it is referenceable from
 * config and shared with the Synapse provider. Parented to the singleton
 * platform StorageAggregator. Idempotent: skips if the bucket already exists.
 */
export class MatrixMediaStorageBucket1782300000001
  implements MigrationInterface
{
  name = 'MatrixMediaStorageBucket1782300000001';

  private readonly bucketId = '00000000-0000-4000-8000-000000000013';
  private readonly bucketAuthId = '00000000-0000-4000-8000-000000000014';

  // 50 MiB (FR-020), reconciled with Synapse max_upload_size + file-service.
  private readonly maxFileSize = 52428800;

  // Curated safe set: images / audio / video / common documents. MUST stay
  // identical to CONVERSATION_MEDIA_ALLOWED_MIME_TYPES in
  // src/common/enums/mime.file.type.ts — inbound Element media (incl. office
  // docs) lands here FIRST, so anything the conversation buckets accept must
  // also pass staging, or it is rejected before it can be re-homed. Inlined
  // (not imported) to keep this migration a self-contained, immutable snapshot
  // per repo convention. Order is irrelevant (simple-array `includes`); the
  // SET must match: visual (excl. SVG) + audio/video + documents.
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
    const existing: { id: string }[] = await queryRunner.query(
      `SELECT id FROM storage_bucket WHERE id = $1`,
      [this.bucketId]
    );
    if (existing.length > 0) {
      return;
    }

    const platform: { storageAggregatorId: string }[] =
      await queryRunner.query(
        `SELECT "storageAggregatorId" FROM platform LIMIT 1`
      );
    const platformStorageAggregatorId = platform?.[0]?.storageAggregatorId;
    if (!platformStorageAggregatorId) {
      throw new Error(
        'MatrixMediaStorageBucket: platform StorageAggregator not found'
      );
    }

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
       VALUES ($1, NOW(), NOW(), 1, '[]', '[]', 'storage-bucket')`,
      [this.bucketAuthId]
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, "createdDate", "updatedDate", version, "authorizationId", "allowedMimeTypes", "maxFileSize", "storageAggregatorId")
       VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, $5)`,
      [
        this.bucketId,
        this.bucketAuthId,
        this.allowedMimeTypes,
        this.maxFileSize,
        platformStorageAggregatorId,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM storage_bucket WHERE id = $1`, [
      this.bucketId,
    ]);
    await queryRunner.query(`DELETE FROM authorization_policy WHERE id = $1`, [
      this.bucketAuthId,
    ]);
  }
}
