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

  // Curated safe set: images / audio / video / common documents.
  private readonly allowedMimeTypes = [
    'image/bmp',
    'image/jpg',
    'image/jpeg',
    'image/x-png',
    'image/png',
    'image/gif',
    'image/webp',
    // image/svg+xml intentionally excluded — SVG can carry active content, so it
    // is not accepted for member-to-member upload (defense-in-depth, feature 013).
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
